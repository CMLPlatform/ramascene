// @flow
import Papa from 'papaparse';
import FilterableSingleSelectDropdownTree from './filterableSingleSelectDropdownTree';

class RegionFilterableSingleSelectDropdownTree extends FilterableSingleSelectDropdownTree {

    constructor(props) {
        super(props);

        this.updateTreeData = this.updateTreeData.bind(this);
    }

    componentWillMount() {
        //https://www.papaparse.com/docs#config
        Papa.parse('../static/final_countryTree_exiovisuals.csv', {
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
            data.push({id: region.global_id, pId: region.parent_id, value: region.global_id.toString(), label: region.name});
        }
        this.setState({data: data, placeholder: "Select region"});
    }

    getLabel(value) {
        var region = this.state.data.find(function(region) {
            return value == parseInt(region.value);
        });
        return region.label;
    }
}

export default RegionFilterableSingleSelectDropdownTree;
