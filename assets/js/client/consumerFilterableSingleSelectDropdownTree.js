// @flow
import Papa from 'papaparse';
import FilterableSingleSelectDropdownTree from './filterableSingleSelectDropdownTree';

class ConsumerFilterableSingleSelectDropdownTree extends FilterableSingleSelectDropdownTree {

    constructor(props) {
        super(props);

        this.updateTreeData = this.updateTreeData.bind(this);
    }

    componentWillMount() {
        //https://www.papaparse.com/docs#config
        Papa.parse('../static/modelling_final_productTree_exiovisuals.csv', {
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

    updateTreeData(result) {
        // result = {data, errors, meta}
        var data = [];
        for (var consumer of result.data) {
            data.push({id: consumer.global_id, pId: consumer.parent_id, value: consumer.global_id.toString(), label: consumer.name});
        }
        this.setState({data: data, placeholder: "select consumer"});
    }

    getLabel(value) {
        var consumer = this.state.data.find(function(consumer) {
            return value == parseInt(consumer.value);
        });
        return consumer.label;
    }
}

export default ConsumerFilterableSingleSelectDropdownTree;