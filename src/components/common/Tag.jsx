import React from 'react';
import './Tag.css';

const Tag = ({
    children,
    color = 'primary', // primary, success, danger, warning, info, secondary
    size = 'md', // sm, md
    className = '',
}) => {
    const tagClasses = `tag tag-${color} tag-${size} ${className}`;

    return <span className={tagClasses}>{children}</span>;
};

export default Tag;
