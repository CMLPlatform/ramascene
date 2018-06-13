// @flow
import Papa from 'papaparse';
import FilterableMultiSelectDropdownTree from './filterableMultiSelectDropdownTree';
import TreeSelect from "rc-tree-select";

class ProductFilterableMultiSelectDropdownTree extends FilterableMultiSelectDropdownTree {

    constructor(props) {
        super(props);

        this.updateTreeData = this.updateTreeData.bind(this);
    }

    handleOnChange(value) {
        var new_value = [];
        if (value !== undefined) {
            new_value = this.selectValue(4, value);
        }
        this.state.callback(new_value);
    }

    selectValue(level, value) {
        var new_value = this.state.data.filter(d => d.level == level && value.includes(d.value)).map(d => d.value);
        if (level > 1) {
            if (new_value.length == 0) {
                new_value = this.selectValue(level - 1, value);
            } else if (new_value.length == 1 && value.length > 2) {
            //    check if there are higher levels with more selections
                var new_value_2 = this.selectValue(level - 1, value);
                if (new_value_2.length > 1) {
                    new_value = new_value_2;
                }
            }
        }
        return new_value;
    }

    componentWillMount() {
        //https://www.papaparse.com/docs#config
        Papa.parse('../static/final_productTree_exiovisuals.csv', {
            delimiter: '\t',
            // newline
            // quoteChar
            // escapeChar
            header: true,
            dynamicTyping: true,
            // preview
            // encoding
            worker: false,
            // comments
            // step
            complete: this.updateTreeData,
            // error
            download: true,
            skipEmptyLines: true,
            // chunk
            fastMode: true
            // beforeFirstChunk
            // withCredentials
        });
    }

    updateTreeData(result/*, file*/) {
        // result = {data, errors, meta}
        var data = [];
        for (var product of result.data) {
            data.push({id: product.Global_id, pId: product.Parent_Id, value: product.Global_id.toString(), label: product.Name, level: product.Level});
        }
        this.setState({disabled: this.state.disabled, data: data, value: this.state.value, placeholder: "select product(s)", callback: this.state.callback});
    }
}

export default ProductFilterableMultiSelectDropdownTree;
