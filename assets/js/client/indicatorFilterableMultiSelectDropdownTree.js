// @flow
import Papa from 'papaparse';
import FilterableMultiSelectDropdownTree from './filterableMultiSelectDropdownTree';
import TreeSelect from "rc-tree-select";

class IndicatorFilterableMultiSelectDropdownTree extends FilterableMultiSelectDropdownTree {

    constructor(props) {
        super(props);

        this.updateTreeData = this.updateTreeData.bind(this);
    }

    componentWillMount() {
        //https://www.papaparse.com/doc#config
        Papa.parse('../static/mod_indicators.csv', {
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
        for (var indicator of result.data) {
            data.push({id: indicator.Global_id, pId: indicator.Parent_id, value: indicator.Global_id.toString(), label: indicator.Name})
        }
        this.setState({disabled: this.state.disabled, data: data, value: this.state.value, placeholder: "select indicators", callback: this.state.callback});
    }
}

export default IndicatorFilterableMultiSelectDropdownTree;
