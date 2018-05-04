// @flow
import Papa from 'papaparse';
import FilterableMultiSelectDropdownTree from './filterableMultiSelectDropdownTree';

class RegionFilterableMultiSelectDropdownTree extends FilterableMultiSelectDropdownTree {

    constructor(props) {
        super(props);

        this.updateTreeData = this.updateTreeData.bind(this);
    }

    componentWillMount() {
        //https://www.papaparse.com/docs#config
        Papa.parse('final_countryTree_exiovisuals.csv', {
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
        for (var region of result.data) {
            // data.push({id: region.Global_id, pId: region.Parent_id, value: {global_id: region.Global_id, parent_id: region.Parent_id}, label: region.Name});
            data.push({id: region.Global_id, pId: region.Parent_id, value: region.Global_id, label: region.Name});
        }
        this.setState({disabled: this.state.disabled, strategy: this.state.strategy, data: data, value: this.state.value, placeholder: "select region(s)", callback: this.state.callback});
    }
}

export default RegionFilterableMultiSelectDropdownTree;