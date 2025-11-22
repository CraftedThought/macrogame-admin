/* src/components/forms/ContentBlockEditor.tsx */

import React from 'react';
import { SkinContentBlock } from '../../types';
import { styles } from '../../App.styles';

interface ContentBlockEditorProps {
    block: SkinContentBlock;
    // Handler to update any field (header, subheader, body, alignment) of this block
    updateBlock: (id: string, field: keyof Omit<SkinContentBlock, 'id' | 'position'>, value: string) => void;
    removeBlock: (id: string) => void;
}

export const ContentBlockEditor: React.FC<ContentBlockEditorProps> = ({ block, updateBlock, removeBlock }) => {
    
    const handleUpdate = (field: keyof Omit<SkinContentBlock, 'id' | 'position'>, value: string) => {
        updateBlock(block.id, field, value);
    };
    
    return (
        <div style={styles.configSection}>
            <input
                type="text"
                value={block.header}
                onChange={e => handleUpdate('header', e.target.value)}
                style={styles.input}
                placeholder="Content Header (Optional)"
            />
            <input
                type="text"
                value={block.subheader}
                onChange={e => handleUpdate('subheader', e.target.value)}
                style={{...styles.input, marginTop: '0.5rem'}}
                placeholder="Content Subheader (Optional)"
            />
            <textarea
                value={block.body}
                onChange={e => handleUpdate('body', e.target.value)}
                style={{...styles.input, marginTop: '0.5rem', minHeight: '60px'}}
                placeholder="Body text (Optional)"
            />
            <div style={{...styles.configItem, marginTop: '0.5rem'}}>
                <label>Text Alignment</label>
                <select 
                    value={block.alignment || 'left'}
                    // Note: 'alignment' is a custom field not yet in types, but we handle it as string here
                    onChange={e => handleUpdate('alignment', e.target.value)}
                    style={styles.input}
                >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                </select>
            </div>
            <button
                type="button"
                onClick={() => removeBlock(block.id)}
                style={{...styles.deleteButton, marginTop: '0.5rem', alignSelf: 'flex-start'}}
            >
                Remove Block
            </button>
        </div>
    );
};