// @flow
import React, {Component} from 'react';
import TreeSelect from 'rc-tree-select';
import 'rc-tree-select/assets/index.css';

class FilterableMultiSelectDropdownTree extends Component {

    constructor(props) {
        super(props);

        this.state = {disabled: props.disabled, data: props.data, value: props.value, placeholder: props.placeholder, callback: props.onChange, selectablelevel: props.selectablelevel};
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            disabled: nextProps.disabled,
            value: nextProps.value,
            selectablelevel: nextProps.selectablelevel
        });
    }

    render() {
        //https://github.com/react-component/tree-select
        return (
            <TreeSelect
                allowClear={true}
                disabled={this.state.disabled}
                dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
                maxTagTextLength={15}
                multiple={true}
                notFoundContent={<i>Not found</i>}
                onChange={this.handleOnChange.bind(this)}
                placeholder={<i>{this.state.placeholder}</i>}
                showCheckedStrategy={TreeSelect.SHOW_PARENT}
                showSearch={true}
                style={{ width: '100%'}}
                // treeCheckable must be true if you want to be able to select all childs by selecting the parent
                treeCheckable={false}
                treeCheckStrictly={true}
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

export default FilterableMultiSelectDropdownTree;