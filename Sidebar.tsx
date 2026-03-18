// Sidebar.tsx

import React from 'react';

const Sidebar = () => {
    const handleClick = (url) => {
        window.open(url, '_blank');
    };

    return (
        <div className="sidebar">
            <button onClick={() => handleClick('https://example.com/auxiliary-link')}>Open Auxiliary Link</button>
        </div>
    );
};

export default Sidebar;