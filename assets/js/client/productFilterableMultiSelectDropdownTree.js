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
        this.state.callback(value);
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
            data.push({id: product.Global_id, pId: product.Parent_Id, value: product.Global_id.toString(), label: product.Name});
        }
        this.setState({disabled: this.state.disabled, data: data, value: this.state.value, placeholder: "select product(s)", callback: this.state.callback});
    }
}

export default ProductFilterableMultiSelectDropdownTree;
