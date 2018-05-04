// @flow
import React, {Component} from 'react';
import TreeSelect from 'rc-tree-select';
import 'rc-tree-select/assets/index.css';

class FilterableSingleSelectDropdownTree extends Component {

    constructor(props) {
        super(props);

        this.state = {disabled: props.disabled, data: props.data, value: props.value, placeholder: props.placeholder, callback: props.onChange};
    }

    componentWillReceiveProps(nextProps) {
        this.setState({disabled: nextProps.disabled, data: this.state.data, value: nextProps.value, placeholder: this.state.placeholder, callback: this.state.callback });
    }

    render() {
        //https://github.com/react-component/tree-select
        return (
            <TreeSelect
                allowClear={true}
                disabled={this.state.disabled}
                dropdownStyle={{ maxHeight: 200, overflow: 'auto' }}
                maxTagTextLength={15}
                multiple={false}
                notFoundContent={<i>Not found</i>}
                onChange={this.state.callback}
                placeholder={<i>{this.state.placeholder}</i>}
                showCheckedStrategy={TreeSelect.SHOW_PARENT}
                showSearch={true}
                style={{ width: '100%'}}
                // treeCheckable cannot be true if you want to dynamically change it
                // treeCheckable must be true if you want to be able to select all childs by selecting the parent
                treeCheckable={false}
                treeCheckStrictly={false}
                treeData={this.state.data}
                treeDataSimpleMode={{id: 'id', pId: 'pId', rootPId: 0}}
                treeDefaultExpandAll={false}
                treeIcon={false}
                treeLine={true}
                treeNodeFilterProp={'label'}
                value={this.state.value}
            />
        );
    }
}

export default FilterableSingleSelectDropdownTree;