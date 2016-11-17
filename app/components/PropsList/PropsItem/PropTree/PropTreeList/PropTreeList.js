import React, { PropTypes } from 'react';

import { Button } from '@reactackle/reactackle';

export const PropTreeList = props => {

	let addButton = null;
	if (props.addButton) {
		addButton =
			<div className="prop-tree-item-action-row">
				<Button
					text="Add field"
					icon="plus"
					size="small"
				    narrow
				/>
			</div>
		;
	}


	return (
		<div className='prop-tree_list'>
			{ props.children }
			{ addButton }
		</div>
	);
};

PropTreeList.propTypes = {
	addButton: PropTypes.bool
};

PropTreeList.defaultProps = {
	addButton: false
};

PropTreeList.displayName = 'PropTreeList';
