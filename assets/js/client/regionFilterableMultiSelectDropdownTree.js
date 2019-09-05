// @flow
import Papa from 'papaparse';
import FilterableMultiSelectDropdownTree from './filterableMultiSelectDropdownTree';

class RegionFilterableMultiSelectDropdownTree extends FilterableMultiSelectDropdownTree {

    constructor(props) {
        super(props);

        this.updateTreeData = this.updateTreeData.bind(this);
    }

    handleOnChange(value) {
        var new_value = [];
        switch (this.state.selectablelevel) {
            case 1:
                // only 'Total' should be selected
                // nextProps.value = this.state.data.filter(d => d.id == d.pId);
                new_value = this.state.data.filter(d => d.level == 1).map(d => d.value);
                break;
            case 2:
                // only continents should be selected
                if (value !== undefined) {
                    // if total is selected then select all continents
                    if (this.state.data.find(function (d) {
                        return d.level == 1 && value.includes(d.value)
                    }) !== undefined) {
                        new_value = this.state.data.filter(d => d.level == 2).map(d => d.value);
                    } else {
                        new_value = this.state.data.filter(d => d.level == 2 && value.includes(d.value)).map(d => d.value);
                        // if a country is selected than select that continent
                        // [...new Set()] serves to filter out doubles
                        new_value = [...new Set(new_value.concat(this.state.data.filter(d => d.level == 3 && value.includes(d.value)).map(d => d.pId.toString())))];
                    }
                }
                break;
            case 3:
                // only countries should be selected
                if (value !== undefined) {
                    // if total is selected then select all countries
                    if (this.state.data.find(d => d.level == 1 && value.includes(d.value)) !== undefined) {
                        new_value = this.state.data.filter(d => d.level == 3).map(d => d.value);
                    } else {
                        new_value = this.state.data.filter(d => d.level == 3 && value.includes(d.value)).map(d => d.value);
                        // if continent is selected then select all countries for the continent
                        // [...new Set()] serves to filter out doubles
                        new_value = [...new Set(new_value.concat(this.state.data.filter(d => d.level == 3 && this.state.data.filter(e => e.level == 2 && value.includes(e.value)).map(e => e.value).includes(d.pId.toString())).map(d => d.value)))];
                    }
                }
                break;
        }
        this.state.callback(new_value);
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
            // data.push({id: region.Global_id, pId: region.Parent_id, value: {global_id: region.Global_id, parent_id: region.Parent_id}, label: region.Name});
            data.push({id: region.global_id, pId: region.parent_id, value: region.global_id.toString(), label: region.name, level: region.level});
        }
        this.setState({data: data, placeholder: "Select regions"});
    }
}

export default RegionFilterableMultiSelectDropdownTree;
