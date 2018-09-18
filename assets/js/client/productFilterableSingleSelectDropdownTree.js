// @flow
import Papa from 'papaparse';
import FilterableSingleSelectDropdownTree from './filterableSingleSelectDropdownTree';

class ProductFilterableSingleSelectDropdownTree extends FilterableSingleSelectDropdownTree {

    constructor(props) {
        super(props);

        this.updateTreeData = this.updateTreeData.bind(this);
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
        this.setState({data: data, placeholder: "select product"});
    }

    getLabel(value) {
        var product = this.state.data.find(function(product) {
            return value == parseInt(product.value);
        });
        return product.label;
    }
}

export default ProductFilterableSingleSelectDropdownTree;
