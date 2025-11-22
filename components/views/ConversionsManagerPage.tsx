/* src/components/views/ConversionsManagerPage.tsx */

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { styles } from '../../App.styles';
import { ConversionMethod, ConversionScreen } from '../../types';
import { useData } from '../../hooks/useData';
import { PaginatedList } from '../ui/PaginatedList';
import { EditConversionModal } from '../modals/EditConversionModal';
import { generateUUID } from '../../utils/helpers';
import { EditConversionScreenModal } from '../modals/EditConversionScreenModal';
import { Modal } from '../ui/Modal';
import { ConversionScreenHost } from '../conversions/ConversionScreenHost';
import * as MethodComponents from '../conversions';
import { notifications } from '../../utils/notifications';
import { FilterBar, FilterConfig } from '../ui/FilterBar';
import { CONVERSION_METHOD_TYPES } from '../../constants';

// --- Algolia & React InstantSearch Imports ---
import * as algoliasearch from 'algoliasearch';
import {
  InstantSearch,
  useHits,
  useSearchBox,
  useConfigure,
  useInstantSearch,
} from 'react-instantsearch';
// --- END Algolia Imports ---

// --- Initialize Algolia Search Client ---
const appId = import.meta.env.VITE_ALGOLIA_APP_ID;
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;
const searchClient = algoliasearch.algoliasearch(appId, searchKey);
// --- END Algolia Client ---

// --- This component connects the search input to Algolia ---
const ConnectedSearchBox = ({
  searchTerm,
  setSearchTerm,
  placeholder,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  placeholder: string;
}) => {
  const { refine } = useSearchBox();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    refine(value);
  };

  useEffect(() => {
    if (searchTerm === '') {
      refine('');
    }
  }, [searchTerm, refine]);

  return (
    <div style={styles.configItem}>
      <label>Search</label>
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleChange}
        style={styles.input}
      />
    </div>
  );
};

// --- Sub-component for listing Conversion Methods from Algolia ---
const MethodList = ({
  filters,
  handleDuplicate,
  handleEdit,
  handleDelete,
  handlePreview,
  handleDeleteMultiple,
}: {
  filters: { [key: string]: string };
  handleDuplicate: (item: ConversionMethod) => void;
  handleEdit: (item: ConversionMethod) => void;
  handleDelete: (id: string) => void;
  handlePreview: (item: ConversionMethod) => void;
  handleDeleteMultiple: (ids: string[]) => void;
}) => {
  useConfigure({
    hitsPerPage: 1000,
    filters: useMemo(() => {
      const algoliaFilters = [];
      if (filters.typeFilter && filters.typeFilter !== 'All') {
        algoliaFilters.push(`type:"${filters.typeFilter}"`);
      }
      return algoliaFilters.join(' AND ');
    }, [filters.typeFilter]),
  });

  const { hits } = useHits();
  const { refresh } = useInstantSearch();
  useEffect(() => {
    refresh();
  }, [refresh]);

  const renderItem = (
    item: ConversionMethod,
    isSelected: boolean,
    onToggleSelect: () => void,
  ) => (
    <li
      key={(item as any).objectID}
      style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}
    >
      <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
      <div style={{ ...styles.rewardInfo, flex: 1 }}>
        <strong>{item.name}</strong>
        {item.status && item.status.code !== 'ok' && (
          <span
            style={{ ...styles.warningTag, marginLeft: '1rem' }}
            title={item.status.message}
          >
            ⚠️ Needs Attention
          </span>
        )}
        <div style={styles.rewardAnalytics}>
          <span style={styles.tag}>
            {item.type.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
      </div>
      <div style={styles.rewardActions}>
        <button
          onClick={() => handlePreview(item)}
          style={styles.previewButton}
        >
          Preview
        </button>
        <button
          onClick={() => handleDuplicate(item)}
          style={styles.editButton}
        >
          Duplicate
        </button>
        <button onClick={() => handleEdit(item)} style={styles.editButton}>
          Edit
        </button>
        <button
          onClick={() => handleDelete((item as any).objectID)}
          style={styles.deleteButton}
        >
          Delete
        </button>
      </div>
    </li>
  );

  return (
    <PaginatedList
      items={hits as ConversionMethod[]}
      renderItem={renderItem}
      bulkActions={[
        {
          label: 'Delete Selected',
          onAction: (selectedItems) =>
            handleDeleteMultiple(selectedItems.map((item: any) => item.objectID)),
        },
      ]}
      listContainerComponent="ul"
      listContainerStyle={styles.rewardsListFull}
    />
  );
};

// --- Sub-component for managing Conversion Methods ---
const MethodManager = () => {
  // --- REFACTOR: Only get actions from useData ---
  const {
    createConversionMethod,
    updateConversionMethod,
    deleteConversionMethod,
    duplicateConversionMethod,
    deleteMultipleConversionMethods,
  } = useData();

  const [editingMethod, setEditingMethod] = useState<ConversionMethod | null>(
    null,
  );
  const [previewingMethod, setPreviewingMethod] =
    useState<ConversionMethod | null>(null);

  // --- NEW: State for Algolia Search ---
  const [methodSearchKey, setMethodSearchKey] = useState(Date.now());
  const [methodSearchTerm, setMethodSearchTerm] = useState('');
  const [methodFilters, setMethodFilters] = useState({ typeFilter: 'All' });
  const forceMethodRefresh = () => setMethodSearchKey(Date.now());

  const { register, handleSubmit, reset, watch, control, getValues } = useForm<
    Partial<Omit<ConversionMethod, 'id' | 'createdAt'>>
  >({
    defaultValues: {
      name: '',
      headline: '',
      subheadline: '',
      type: 'coupon_display',
      fields: [],
      links: [],
      submitButtonText: 'Submit',
    },
  });

  const {
    fields,
    append: appendFormField,
    remove: removeFormField,
  } = useFieldArray({ control, name: 'fields' });
  const {
    fields: socialLinks,
    append: appendSocialLink,
    remove: removeSocialLink,
  } = useFieldArray({ control, name: 'links' });
  const selectedType = watch('type');

  useEffect(() => {
    const currentName = watch('name');
    const currentHeadline = watch('headline');
    const currentSubheadline = watch('subheadline');

    // --- Set default fields/links based on selected type ---
    let defaultFields: any[] = [];
    let defaultLinks: any[] = [];

    if (selectedType === 'form_submit') {
      // Add one default field. The name 'field_1' matches the append logic.
      defaultFields = [
        { label: '', type: 'text', required: true, name: 'field_1' },
      ];
    } else if (selectedType === 'social_follow') {
      // Add one default link.
      defaultLinks = [{ platform: 'instagram', url: '' }];
    }

    reset({
      name: currentName,
      headline: currentHeadline,
      subheadline: currentSubheadline,
      type: selectedType,
      fields: defaultFields,
      links: defaultLinks,
      submitButtonText: 'Submit',
    });
  }, [selectedType, reset, watch]);

  const handlePreviewNewMethod = () => {
    const data = getValues(); // Get all current form data

    const baseData = { 
        id: 'PREVIEW_ID', // Add a fake ID for the previewer
        name: data.name || 'New Method (Preview)', 
        headline: data.headline || '', 
        subheadline: data.subheadline || '', 
        createdAt: new Date().toISOString(),
        status: { code: 'ok', message: '' }
    };
    let newMethod: ConversionMethod;

    switch (data.type) {
        case 'coupon_display':
            newMethod = { ...baseData, type: 'coupon_display', codeType: data.codeType || 'static', staticCode: data.staticCode || '', discountType: data.discountType || 'percentage', discountValue: Number(data.discountValue) || 0, clickToReveal: data.clickToReveal || false };
            break;
        case 'email_capture':
            newMethod = { ...baseData, type: 'email_capture', submitButtonText: data.submitButtonText || 'Submit' };
            break;
        case 'link_redirect':
            newMethod = { ...baseData, type: 'link_redirect', buttonText: data.buttonText || 'Learn More', url: data.url || '', utmEnabled: data.utmEnabled || false };
            break;
        case 'form_submit':
            newMethod = { ...baseData, type: 'form_submit', fields: data.fields || [], submitButtonText: data.submitButtonText || 'Submit' };
            break;
        case 'social_follow':
            newMethod = { ...baseData, type: 'social_follow', links: data.links || [] };
            break;
        default:
            notifications.error("Invalid method type selected.");
            return;
    }
    // Use the *existing* preview state to show the modal
    setPreviewingMethod(newMethod);
  };


  // --- CUD actions now use the full blocking refresh pattern ---

  const handleCreate: SubmitHandler<any> = async (data) => {
    if (!data.name?.trim()) {
      notifications.error('Please enter a name for the method.');
      return;
    }

    const loadingToast = notifications.loading('Creating conversion method...');

    const baseData = {
      name: data.name,
      headline: data.headline || '',
      subheadline: data.subheadline || '',
      createdAt: new Date().toISOString(),
    };
    let newMethod: Omit<ConversionMethod, 'id'>;

    switch (data.type) {
      case 'coupon_display':
        newMethod = {
          ...baseData,
          type: 'coupon_display',
          codeType: data.codeType || 'static',
          staticCode: data.staticCode || '',
          discountType: data.discountType || 'percentage',
          discountValue: Number(data.discountValue) || 0,
          clickToReveal: data.clickToReveal || false,
        };
        break;
      case 'email_capture':
        newMethod = {
          ...baseData,
          type: 'email_capture',
          submitButtonText: data.submitButtonText || 'Submit',
        };
        break;
      case 'link_redirect':
        newMethod = {
          ...baseData,
          type: 'link_redirect',
          buttonText: data.buttonText || 'Learn More',
          url: data.url || '',
          utmEnabled: data.utmEnabled || false,
        };
        break;
      case 'form_submit':
        newMethod = {
          ...baseData,
          type: 'form_submit',
          fields: data.fields || [],
          submitButtonText: data.submitButtonText || 'Submit',
        };
        break;
      case 'social_follow':
        newMethod = {
          ...baseData,
          type: 'social_follow',
          links: data.links || [],
        };
        break;
      default:
        notifications.dismiss(loadingToast);
        notifications.error('Invalid method type selected.');
        return;
    }

    try {
      await createConversionMethod(newMethod);
      await new Promise((resolve) => setTimeout(resolve, 4000)); // Algolia delay
      notifications.dismiss(loadingToast);
      notifications.success('Conversion method created');
      reset({
        name: '',
        headline: '',
        subheadline: '',
        type: 'coupon_display',
        fields: [],
        links: [],
        submitButtonText: 'Submit',
      });
      forceMethodRefresh(); // Refresh the list
    } catch (error) {
      notifications.dismiss(loadingToast);
      notifications.error('Failed to create method.');
      console.error(error);
    }
  };

  // --- NEW: Handle Update with blocking refresh ---
  const handleUpdateMethod = async (
    methodId: string,
    data: Partial<Omit<ConversionMethod, 'id'>>,
  ) => {
    const loadingToast = notifications.loading('Updating method...');
    try {
      await updateConversionMethod(methodId, data);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      notifications.dismiss(loadingToast);
      notifications.success('Conversion method updated');
      setEditingMethod(null); // Close the modal
      forceMethodRefresh(); // Refresh the list
    } catch (error) {
      notifications.dismiss(loadingToast);
      notifications.error('Failed to update method.');
    }
  };

  const handleDeleteMethod = async (id: string) => {
    const wasDeleted = await deleteConversionMethod(id); // Has confirm dialog
    if (wasDeleted) {
      const loadingToast = notifications.loading('Deleting method...');
      await new Promise((resolve) => setTimeout(resolve, 4000));
      notifications.dismiss(loadingToast);
      notifications.success('Method deleted');
      forceMethodRefresh();
    }
  };

  const handleDuplicateMethod = async (item: ConversionMethod) => {
    const loadingToast = notifications.loading('Duplicating method...');
    try {
      await duplicateConversionMethod(item);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      notifications.dismiss(loadingToast);
      notifications.success('Method duplicated');
      forceMethodRefresh();
    } catch (error) {
      notifications.dismiss(loadingToast);
      notifications.error('Failed to duplicate method.');
    }
  };

  const handleDeleteMultipleMethods = async (ids: string[]) => {
    const wasConfirmed = await deleteMultipleConversionMethods(ids);
    if (wasConfirmed) {
      const loadingToast = notifications.loading(`Deleting ${ids.length} methods...`);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      notifications.dismiss(loadingToast);
      notifications.success(`${ids.length} methods deleted`);
      forceMethodRefresh();
    }
  };

  // --- NEW: Filter Config ---
  const methodFilterConfig: FilterConfig[] = [
    {
      type: 'select',
      label: 'Method Type',
      stateKey: 'typeFilter',
      options: [
        'All',
        ...CONVERSION_METHOD_TYPES.map((type) => ({
          value: type,
          label: type
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase()),
        })),
      ],
    },
  ];

  const handleMethodFilterChange = (key: string, value: string) => {
    setMethodFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleMethodResetFilters = () => {
    setMethodFilters({ typeFilter: 'All' });
    setMethodSearchTerm('');
    forceMethodRefresh();
  };

  const PreviewComponent = previewingMethod
    ? (MethodComponents[
        Object.keys(MethodComponents).find((key) =>
          key
            .toLowerCase()
            .includes(previewingMethod.type.split('_')[0]),
        ) as keyof typeof MethodComponents
      ] as React.ElementType)
    : null;

  return (
    <div>
      <EditConversionModal
        isOpen={!!editingMethod}
        onClose={() => setEditingMethod(null)}
        conversion={editingMethod}
        onSave={handleUpdateMethod}
      />
      <Modal
        isOpen={!!previewingMethod}
        onClose={() => setPreviewingMethod(null)}
        title={`Preview: ${previewingMethod?.name}`}
      >
        {PreviewComponent && previewingMethod && (
          <PreviewComponent
            method={previewingMethod as any}
            onSuccess={() => notifications.success('Preview action successful')}
          />
        )}
      </Modal>
      <form onSubmit={handleSubmit(handleCreate)}>
        <h3 style={styles.h3}>Create New Conversion Method</h3>
        <div style={styles.configRow}>
          <div style={styles.configItem}>
            <label>Internal Name</label>
            <input
              type="text"
              placeholder="e.g., Summer Sale Coupon"
              {...register('name')}
              style={styles.input}
            />
          </div>
          <div style={styles.configItem}>
            <label>Method Type</label>
            <select {...register('type')} style={styles.input}>
              <option value="coupon_display">Coupon Display</option>
              <option value="email_capture">Email Capture</option>
              <option value="link_redirect">Link Redirect</option>
              <option value="form_submit">Form Submit</option>
              <option value="social_follow">Social Follow</option>
            </select>
          </div>
        </div>

        <h4 style={{ ...styles.h4, marginTop: '2rem' }}>Configuration</h4>
        <div style={styles.configRow}>
          <div style={styles.configItem}>
            <label>Headline</label>
            <input
              type="text"
              placeholder="e.g., 20% Off All Purchases!"
              {...register('headline')}
              style={styles.input}
            />
          </div>
          <div style={styles.configItem}>
            <label>Subheadline</label>
            <input
              type="text"
              placeholder="e.g., Use the code SUMMER25 at checkout."
              {...register('subheadline')}
              style={styles.input}
            />
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          {selectedType === 'coupon_display' && (
            <div style={styles.configRow}>
              {' '}
              <div style={styles.configItem}>
                <label>Coupon Type</label>
                <select {...register('codeType')} style={styles.input}>
                  <option value="static">Static Code</option>
                  <option value="dynamic" disabled>
                    Dynamic Codes (Coming Soon)
                  </option>
                </select>
              </div>{' '}
              <div style={styles.configItem}>
                <label>Static Code</label>
                <input
                  type="text"
                  placeholder="SUMMER25"
                  {...register('staticCode')}
                  style={styles.input}
                />
              </div>{' '}
              <div
                style={{
                  ...styles.configItem,
                  justifyContent: 'center',
                  alignSelf: 'flex-end',
                  paddingBottom: '0.6rem',
                }}
              >
                {' '}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {' '}
                  <input type="checkbox" {...register('clickToReveal')} />{' '}
                  <span>Click to Reveal</span>{' '}
                </label>{' '}
              </div>{' '}
              <div style={styles.configItem}>
                <label>Discount Type</label>
                <select {...register('discountType')} style={styles.input}>
                  <option value="percentage">% Percentage</option>
                  <option value="fixed_amount">$ Fixed Amount</option>
                </select>
              </div>{' '}
              <div style={styles.configItem}>
                <label>Discount Value</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('discountValue')}
                  style={styles.input}
                />
              </div>{' '}
            </div>
          )}
          {selectedType === 'link_redirect' && (
            <div>
              {' '}
              <div style={styles.configRow}>
                {' '}
                <div style={styles.configItem}>
                  <label>Button Text</label>
                  <input
                    type="text"
                    placeholder="Shop Now"
                    {...register('buttonText')}
                    style={styles.input}
                  />
                </div>{' '}
                <div style={styles.configItem}>
                  <label>Destination URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    {...register('url')}
                    style={styles.input}
                  />
                </div>{' '}
              </div>{' '}
              <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                <label>
                  <input type="checkbox" {...register('utmEnabled')} /> Enable
                  UTM Tracking
                </label>
              </div>{' '}
            </div>
          )}
          {selectedType === 'email_capture' && (
            <div style={styles.configItem}>
              <label>Submit Button Text</label>
              <input
                type="text"
                {...register('submitButtonText')}
                style={styles.input}
              />
            </div>
          )}
          {selectedType === 'form_submit' && (
            <div>
              {' '}
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  style={{
                    ...styles.configRow,
                    border: '1px solid #eee',
                    padding: '1rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                  }}
                >
                  {' '}
                  <div style={styles.configItem}>
                    <label>Field Label</label>
                    <input
                      {...register(`fields.${index}.label`)}
                      style={styles.input}
                    />
                  </div>{' '}
                  <div style={styles.configItem}>
                    <label>Field Type</label>
                    <select
                      {...register(`fields.${index}.type`)}
                      style={styles.input}
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="number">Number</option>
                    </select>
                  </div>{' '}
                  <div
                    style={{
                      ...styles.configItem,
                      flex: '0 0 auto',
                      justifyContent: 'center',
                    }}
                  >
                    <label>
                      <input
                        type="checkbox"
                        {...register(`fields.${index}.required`)}
                      />{' '}
                      Required
                    </label>
                  </div>{' '}
                  <button
                    type="button"
                    onClick={() => removeFormField(index)}
                    style={{ ...styles.deleteButton, alignSelf: 'flex-end' }}
                  >
                    Remove
                  </button>{' '}
                </div>
              ))}{' '}
              <button
                type="button"
                onClick={() =>
                  appendFormField({
                    label: '',
                    type: 'text',
                    required: true,
                    name: `field_${fields.length + 1}`,
                  })
                }
                style={styles.secondaryButton}
              >
                Add Field
              </button>{' '}
              <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                <label>Submit Button Text</label>
                <input
                  type="text"
                  {...register('submitButtonText')}
                  style={styles.input}
                />
              </div>{' '}
            </div>
          )}
          {selectedType === 'social_follow' && (
            <div>
              {' '}
              {socialLinks.map((link, index) => (
                <div
                  key={link.id}
                  style={{
                    ...styles.configRow,
                    border: '1px solid #eee',
                    padding: '1rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                  }}
                >
                  {' '}
                  <div style={styles.configItem}>
                    <label>Platform</label>
                    <select
                      {...register(`links.${index}.platform`)}
                      style={styles.input}
                    >
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="x">X (Twitter)</option>
                      <option value="facebook">Facebook</option>
                      <option value="youtube">YouTube</option>
                      <option value="pinterest">Pinterest</option>
                    </select>
                  </div>{' '}
                  <div style={styles.configItem}>
                    <label>Profile URL</label>
                    <input
                      type="url"
                      {...register(`links.${index}.url`)}
                      style={styles.input}
                    />
                  </div>{' '}
                  <button
                    type="button"
                    onClick={() => removeSocialLink(index)}
                    style={{ ...styles.deleteButton, alignSelf: 'flex-end' }}
                  >
                    Remove
                  </button>{' '}
                </div>
              ))}{' '}
              <button
                type="button"
                onClick={() =>
                  appendSocialLink({ platform: 'instagram', url: '' })
                }
                style={styles.secondaryButton}
              >
                Add Link
              </button>{' '}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
                type="button"
                onClick={handlePreviewNewMethod}
                style={{ ...styles.previewButton, flex: 1 }}
            >
                Preview
            </button>
            <button
                type="submit"
                style={{ ...styles.createButton, flex: 2 }}
            >
                Create Method
            </button>
        </div>
      </form>
      <div style={{ marginTop: '3rem' }}>
        <InstantSearch
          key={methodSearchKey}
          searchClient={searchClient}
          indexName="conversionMethods"
        >
          <div style={styles.filterContainer}>
            <ConnectedSearchBox
              searchTerm={methodSearchTerm}
              setSearchTerm={setMethodSearchTerm}
              placeholder="Search methods..."
            />
            <FilterBar
              filters={methodFilterConfig}
              filterValues={methodFilters}
              onFilterChange={handleMethodFilterChange}
              onResetFilters={handleMethodResetFilters}
            />
          </div>
          <h3 style={styles.h3}>Existing Conversion Methods</h3>
          <MethodList
            filters={methodFilters}
            handleDelete={handleDeleteMethod}
            handleDuplicate={handleDuplicateMethod}
            handleEdit={setEditingMethod}
            handlePreview={setPreviewingMethod}
            handleDeleteMultiple={handleDeleteMultipleMethods}
          />
        </InstantSearch>
      </div>
    </div>
  );
};

// --- Sub-component for listing Conversion Screens from Algolia ---
const ScreenList = ({
  filters,
  handleDuplicate,
  handleEdit,
  handleDelete,
  handlePreview,
  handleDeleteMultiple,
}: {
  filters: { [key: string]: any }; // <-- UPDATED to 'any' for methodsFilter array
  handleDuplicate: (item: ConversionScreen) => void;
  handleEdit: (item: ConversionScreen) => void;
  handleDelete: (id: string) => void;
  handlePreview: (item: ConversionScreen) => void;
  handleDeleteMultiple: (ids: string[]) => void;
}) => {
  useConfigure({
    hitsPerPage: 1000,
    filters: useMemo(() => {
      const algoliaFilters = [];
      // --- Filter 1: Health Status ---
      if (filters.statusFilter && filters.statusFilter !== 'All') {
        algoliaFilters.push(`status.code:"${filters.statusFilter}"`);
      }
      // --- Filter 2: Contains Methods ---
      if (filters.methodsFilter && filters.methodsFilter.length > 0) {
        // Create an "AND" filter for all selected methods
        const methodFilters = filters.methodsFilter.map(
          (id: string) => `methodIdList:"${id}"`,
        );
        algoliaFilters.push(methodFilters.join(' AND '));
      }
      return algoliaFilters.join(' AND ');
    }, [filters.statusFilter, filters.methodsFilter]), // <-- UPDATED dependencies
  });

  const { hits } = useHits();
  const { refresh } = useInstantSearch();
  useEffect(() => {
    refresh();
  }, [refresh]);

  const renderItem = (
    item: ConversionScreen,
    isSelected: boolean,
    onToggleSelect: () => void,
  ) => (
    <li
      key={(item as any).objectID}
      style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}
    >
      <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
      <div style={{ ...styles.rewardInfo, flex: 1 }}>
        <div>
          <strong>{item.name}</strong>
          {item.status && item.status.code !== 'ok' && (
            <span
              style={{ ...styles.warningTag, marginLeft: '1rem' }}
              title={item.status.message}
            >
              ⚠️ Needs Attention
            </span>
          )}
        </div>
        <div style={styles.rewardAnalytics}>
          <span>Methods: {item.methods?.length || 0}</span>
        </div>
      </div>
      <div style={styles.rewardActions}>
        <button
          onClick={() => handlePreview(item)}
          style={styles.previewButton}
        >
          Preview
        </button>
        <button
          onClick={() => handleDuplicate(item)}
          style={styles.editButton}
        >
          Duplicate
        </button>
        <button onClick={() => handleEdit(item)} style={styles.editButton}>
          Edit
        </button>
        <button
          onClick={() => handleDelete((item as any).objectID)}
          style={styles.deleteButton}
        >
          Delete
        </button>
      </div>
    </li>
  );

  return (
    <PaginatedList
      items={hits as ConversionScreen[]}
      renderItem={renderItem}
      bulkActions={[
        {
          label: 'Delete Selected',
          onAction: (selectedItems) =>
            handleDeleteMultiple(selectedItems.map((item: any) => item.objectID)),
        },
      ]}
      listContainerComponent="ul"
      listContainerStyle={styles.rewardsListFull}
    />
  );
};

// --- Sub-component for managing Conversion Screens ---
const ScreenManager = () => {
  // --- REFACTOR: Get all methods for dropdowns, but actions for CUD ---
  const {
    allConversionMethods,
    createConversionScreen,
    updateConversionScreen,
    deleteConversionScreen,
    duplicateConversionScreen,
    deleteMultipleConversionScreens,
  } = useData();
  const [editingScreen, setEditingScreen] = useState<ConversionScreen | null>(
    null,
  );
  const [previewingScreen, setPreviewingScreen] =
    useState<ConversionScreen | null>(null);

  // --- NEW: State for Algolia Search ---
  const [screenSearchKey, setScreenSearchKey] = useState(Date.now());
  const [screenSearchTerm, setScreenSearchTerm] = useState('');
  // --- UPDATED: Add methodsFilter to state ---
  const [screenFilters, setScreenFilters] = useState({
    statusFilter: 'All',
    methodsFilter: [] as string[],
  });
  const forceScreenRefresh = () => setScreenSearchKey(Date.now());

  const { register, handleSubmit, reset, control, watch, setValue, getValues } =
    useForm<Omit<ConversionScreen, 'id'>>({
      defaultValues: {
        name: '',
        headline: '',
        bodyText: '',
        layout: 'single_column',
        methods: [
          { instanceId: generateUUID(), methodId: '', gate: { type: 'none' } },
        ],
      },
    });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'methods',
    keyName: 'key',
  });
  const watchedMethods = watch('methods');

  const handlePreviewNewScreen = () => {
    const data = getValues(); // Get all current form data

    // Construct a fake ConversionScreen object for the preview
    const newScreen: ConversionScreen = {
        id: 'PREVIEW_ID',
        name: data.name || 'New Screen (Preview)',
        headline: data.headline || '',
        bodyText: data.bodyText || '',
        layout: data.layout || 'single_column',
        methods: (data.methods || []).map(m => ({
            instanceId: m?.instanceId || generateUUID(),
            methodId: m?.methodId || '',
            gate: m?.gate
        })),
        status: { code: 'ok', message: '' },
        methodIdList: (data.methods || []).map(m => m?.methodId || '')
    };

    // Use the *existing* preview state to show the modal
    setPreviewingScreen(newScreen);
  };

  // --- REFACTOR: CUD actions now use the full blocking refresh pattern ---

  const handleCreate: SubmitHandler<Omit<ConversionScreen, 'id'>> = async (
    data,
  ) => {
    if (!data.name?.trim()) {
      notifications.error('Please enter a name for the screen.');
      return;
    }
    if (data.methods.length === 0) {
      notifications.error('Please add at least one conversion method.');
      return;
    }

    const hasEmptyMethod = data.methods.some(m => !m.methodId);
    if (hasEmptyMethod) {
      notifications.error('Please select a conversion method for every item in the list.');
      return;
    }

    const loadingToast = notifications.loading('Creating conversion screen...');

    // --- LOGIC: Clean gate data before saving ---
    const finalData = {
      ...data,
      methods: (data.methods || []).map((method) => {
        const newMethod = { ...method };
        if (!newMethod.gate || newMethod.gate.type === 'none') {
          delete newMethod.gate;
        } else if (newMethod.gate.type === 'on_points') {
          delete newMethod.gate.methodInstanceId;
        } else if (
          newMethod.gate.type === 'on_success' &&
          !newMethod.gate.methodInstanceId
        ) {
          delete newMethod.gate;
        }
        return newMethod;
      }),
    };
    // --- END LOGIC ---

    try {
      await createConversionScreen(finalData);
      await new Promise((resolve) => setTimeout(resolve, 4000)); // Algolia delay
      notifications.dismiss(loadingToast);
      notifications.success('Conversion Screen created');
      reset({
        name: '',
        headline: '',
        bodyText: '',
        layout: 'single_column',
        methods: [
          { instanceId: generateUUID(), methodId: '', gate: { type: 'none' } },
        ],
      });
      forceScreenRefresh(); // Refresh the list
    } catch (error) {
      notifications.dismiss(loadingToast);
      notifications.error('Failed to create screen.');
      console.error(error);
    }
  };

  // --- NEW: Handle Update with blocking refresh ---
  const handleUpdateScreen = async (
    screenId: string,
    data: Partial<Omit<ConversionScreen, 'id'>>,
  ) => {
    const loadingToast = notifications.loading('Updating screen...');
    try {
      await updateConversionScreen(screenId, data);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      notifications.dismiss(loadingToast);
      notifications.success('Conversion screen updated');
      setEditingScreen(null); // Close the modal
      forceScreenRefresh(); // Refresh the list
    } catch (error) {
      notifications.dismiss(loadingToast);
      notifications.error('Failed to update screen.');
    }
  };

  const handleDeleteScreen = async (id: string) => {
    const wasDeleted = await deleteConversionScreen(id);
    if (wasDeleted) {
      const loadingToast = notifications.loading('Deleting screen...');
      await new Promise((resolve) => setTimeout(resolve, 4000));
      notifications.dismiss(loadingToast);
      notifications.success('Screen deleted');
      forceScreenRefresh();
    }
  };

  const handleDuplicateScreen = async (item: ConversionScreen) => {
    const loadingToast = notifications.loading('Duplicating screen...');
    try {
      await duplicateConversionScreen(item);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      notifications.dismiss(loadingToast);
      notifications.success('Screen duplicated');
      forceScreenRefresh();
    } catch (error) {
      notifications.dismiss(loadingToast);
      notifications.error('Failed to duplicate screen.');
    }
  };

  const handleDeleteMultipleScreens = async (ids: string[]) => {
    const wasConfirmed = await deleteMultipleConversionScreens(ids);
    if (wasConfirmed) {
      const loadingToast = notifications.loading(`Deleting ${ids.length} screens...`);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      notifications.dismiss(loadingToast);
      notifications.success(`${ids.length} screens deleted`);
      forceScreenRefresh();
    }
  };

  // --- NEW: Filter Config ---
  const screenFilterConfig: FilterConfig[] = useMemo(() => {
    const methodOptions = allConversionMethods.map(m => ({
        value: m.id,
        label: `${m.name} (${m.type.replace(/_/g, ' ')})`
    }));

    return [
        {
          type: 'select',
          label: 'Health Status', // <-- RENAMED
          stateKey: 'statusFilter',
          options: [
            { value: 'All', label: 'All' },
            { value: 'ok', label: 'OK' },
            { value: 'error', label: 'Needs Attention' },
          ],
        },
        { // <-- NEW FILTER
            type: 'multiselect',
            label: 'Contains Method',
            stateKey: 'methodsFilter',
            options: methodOptions,
        }
      ];
  }, [allConversionMethods]); // Depends on the global list of methods

  const handleScreenFilterChange = (key: string, value: string | string[]) => {
    setScreenFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleScreenResetFilters = () => {
    setScreenFilters({ statusFilter: 'All', methodsFilter: [] }); // <-- UPDATED
    setScreenSearchTerm('');
    forceScreenRefresh();
  };

  return (
    <div>
      <EditConversionScreenModal
        isOpen={!!editingScreen}
        onClose={() => setEditingScreen(null)}
        screen={editingScreen}
        onSave={handleUpdateScreen}
      />
      <Modal
        isOpen={!!previewingScreen}
        onClose={() => setPreviewingScreen(null)}
        title={`Preview: ${previewingScreen?.name}`}
        size="large"
      >
        {previewingScreen && (
          <div
            style={{
              height: '60vh',
              backgroundColor: '#2d3436',
              borderRadius: '6px',
              color: 'white',
            }}
          >
            <ConversionScreenHost screen={previewingScreen} />
          </div>
        )}
      </Modal>
      <form onSubmit={handleSubmit(handleCreate)}>
        <h3 style={styles.h3}>Create New Conversion Screen</h3>
        <div style={styles.configItem}>
          <label>Internal Name</label>
          <input
            type="text"
            placeholder="e.g., Default Post-Game Screen"
            {...register('name')}
            style={styles.input}
          />
        </div>
        <h4 style={{ ...styles.h4, marginTop: '2rem' }}>
          Screen Content & Styling
        </h4>
        <div style={styles.configRow}>
          <div style={styles.configItem}>
            <label>Headline</label>
            <input
              type="text"
              placeholder="e.g., Congratulations!"
              {...register('headline')}
              style={styles.input}
            />
          </div>
          <div style={styles.configItem}>
            <label>Body Text</label>
            <input
              type="text"
              placeholder="Here are your rewards!"
              {...register('bodyText')}
              style={styles.input}
            />
          </div>
          <div style={styles.configItem}>
            <label>Layout</label>
            <select {...register('layout')} style={styles.input}>
              <option value="single_column">Single Column</option>
            </select>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '2rem',
          }}
        >
          <h4 style={{ ...styles.h4, margin: 0 }}>Conversion Methods</h4>
          {allConversionMethods.length === 0 && (
            <span style={styles.warningTag}>
              Create a Method in the "Methods" tab first.
            </span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginTop: '1rem',
          }}
        >
          {fields.map((field, index) => {
            const availableGates = watchedMethods.filter((_, i) => i < index);
            const selectedMethodId = watch(`methods.${index}.methodId`);
            const selectedMethod = allConversionMethods.find(
              (m) => m.id === selectedMethodId,
            );
            const gateType = watch(`methods.${index}.gate.type`);

            return (
              <div
                key={field.key}
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  padding: '1rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <strong style={{ fontSize: '1.1rem' }}>
                    Method {index + 1}: {selectedMethod?.name || 'New Method'}
                  </strong>
                  <div>
                    <button
                      type="button"
                      onClick={() => move(index, index - 1)}
                      disabled={index === 0}
                      style={styles.flowCardButton}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, index + 1)}
                      disabled={index === fields.length - 1}
                      style={styles.flowCardButton}
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      style={{ ...styles.deleteButton, marginLeft: '1rem' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div style={styles.configRow}>
                  <div style={styles.configItem}>
                    <label>Method</label>
                    <select
                      {...register(`methods.${index}.methodId`)}
                      style={styles.input}
                    >
                      <option value="">Select a method...</option>
                      {allConversionMethods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.type.replace(/_/g, ' ')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.configItem}>
                    <label>Gate Type (Locked Offer)</label>
                    <select
                      {...register(`methods.${index}.gate.type`)}
                      style={styles.input}
                      defaultValue="none"
                      onChange={(e) => {
                        setValue(
                          `methods.${index}.gate.type`,
                          e.target.value as 'none' | 'on_success' | 'on_points',
                        );
                        if (e.target.value !== 'on_success') {
                          setValue(
                            `methods.${index}.gate.methodInstanceId`,
                            undefined,
                          );
                        }
                      }}
                    >
                      <option value="none">None (Always Visible)</option>
                      <option value="on_success">On Method Success</option>
                      <option value="on_points">On Point Threshold</option>
                    </select>
                  </div>
                </div>

                {gateType === 'on_success' && (
                  <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                    <label>Select Prerequisite Method</label>
                    <select
                      {...register(`methods.${index}.gate.methodInstanceId`)}
                      style={styles.input}
                    >
                      <option value="">Select a method to complete...</option>
                      {availableGates.map((gateField, gateIndex) => (
                        <option
                          key={gateField.instanceId || gateIndex}
                          value={gateField.instanceId}
                        >
                          Method{' '}
                          {watchedMethods.findIndex(
                            (f) => f.instanceId === gateField.instanceId,
                          ) + 1}
                          :
                          {
                            allConversionMethods.find(
                              (m) => m.id === gateField.methodId,
                            )?.name
                          }
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() =>
            append({
              instanceId: generateUUID(),
              methodId: '',
              gate: { type: 'none' },
            })
          }
          style={{ ...styles.secondaryButton, marginTop: '1rem' }}
        >
          Add New Method
        </button>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
                type="button"
                onClick={handlePreviewNewScreen}
                style={{ ...styles.previewButton, flex: 1 }}
            >
                Preview
            </button>
            <button
                type="submit"
                style={{ ...styles.createButton, flex: 2 }}
            >
                Create Screen
            </button>
        </div>
      </form>
      <div style={{ marginTop: '3rem' }}>
        <InstantSearch
          key={screenSearchKey}
          searchClient={searchClient}
          indexName="conversionScreens"
        >
          <div style={styles.filterContainer}>
            <ConnectedSearchBox
              searchTerm={screenSearchTerm}
              setSearchTerm={setScreenSearchTerm}
              placeholder="Search screens..."
            />
            <FilterBar
              filters={screenFilterConfig}
              filterValues={screenFilters}
              onFilterChange={handleScreenFilterChange}
              onResetFilters={handleScreenResetFilters}
            />
          </div>
          <h3 style={styles.h3}>Existing Conversion Screens</h3>
          <ScreenList
            filters={screenFilters}
            handleDelete={handleDeleteScreen}
            handleDuplicate={handleDuplicateScreen}
            handleEdit={setEditingScreen}
            handlePreview={setPreviewingScreen}
            handleDeleteMultiple={handleDeleteMultipleScreens}
          />
        </InstantSearch>
      </div>
    </div>
  );
};

export const ConversionsManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'screens' | 'methods'>('screens');

  return (
    <div style={styles.creatorSection}>
      <div style={styles.managerHeader}>
        <h2 style={styles.h2}>Conversion Manager</h2>
      </div>
      <div style={styles.tabContainer}>
        <button
          onClick={() => setActiveTab('screens')}
          style={
            activeTab === 'screens'
              ? { ...styles.tabButton, ...styles.tabButtonActive }
              : styles.tabButton
          }
        >
          Screens
        </button>
        <button
          onClick={() => setActiveTab('methods')}
          style={
            activeTab === 'methods'
              ? { ...styles.tabButton, ...styles.tabButtonActive }
              : styles.tabButton
          }
        >
          Methods
        </button>
      </div>

      {activeTab === 'screens' ? <ScreenManager /> : <MethodManager />}
    </div>
  );
};