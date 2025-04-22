import React from 'react'

const RenderIf = ({condition, children}) => {
    if(!condition) {
        return <React.Fragment />;
    }
    return children;
}

export default RenderIf;
