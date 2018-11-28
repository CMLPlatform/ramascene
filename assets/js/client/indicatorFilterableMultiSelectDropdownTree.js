// @flow
import Papa from 'papaparse';
import FilterableMultiSelectDropdownTree from './filterableMultiSelectDropdownTree';
import TreeSelect from "rc-tree-select";

class IndicatorFilterableMultiSelectDropdownTree extends FilterableMultiSelectDropdownTree {

    constructor(props) {
        super(props);

        this.updateTreeData = this.updateTreeData.bind(this);
    }

    handleOnChange(value) {
        this.state.callback(value);
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
            data.push({id: indicator.global_id, pId: indicator.parent_id, value: indicator.global_id.toString(), label: indicator.name})
        }
        this.setState({data: data, placeholder: "select indicators"});
    }
}

export default IndicatorFilterableMultiSelectDropdownTree;
