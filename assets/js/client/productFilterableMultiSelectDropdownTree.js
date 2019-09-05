// @flow
import Papa from 'papaparse';
import FilterableMultiSelectDropdownTree from './filterableMultiSelectDropdownTree';
import TreeSelect from "rc-tree-select";
import {Button, ButtonGroup} from "react-bootstrap";
import React from "react";

class ProductFilterableMultiSelectDropdownTree extends FilterableMultiSelectDropdownTree {

    constructor(props) {
        super(props);

        this.MANUAL = 0;
        this.ALL_SECTORS = 2;
        this.ALL_SUBSECTORS = 3;
        this.ALL_PRODUCTS = 4;

        this.updateTreeData = this.updateTreeData.bind(this);
    }

    handleOnChange(value) {
        this.setState({quick_select: this.MANUAL});

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
            data.push({id: product.global_id, pId: product.parent_id, value: product.global_id.toString(), label: product.name, level: product.level});
        }
        this.setState({data: data, placeholder: "Select products"});
    }

    render() {
        return (
            <React.Fragment>
                <ButtonGroup>
                    <Button disabled={this.state.disabled}
                            onClick={this.handleAllSectorsClicked.bind(this)}
                            active={this.state.quick_select == this.ALL_SECTORS}>Sectors</Button>
                    <Button disabled={this.state.disabled}
                            onClick={this.handleAllSubsectorsClicked.bind(this)}
                            active={this.state.quick_select == this.ALL_SUBSECTORS}>Subsectors</Button>
                    <Button disabled={this.state.disabled}
                            onClick={this.handleAllProductsClicked.bind(this)}
                            active={this.state.quick_select == this.ALL_PRODUCTS}>Products</Button>
                </ButtonGroup>
                {super.render()}
            </React.Fragment>
        )
    }

    handleAllProductsClicked() {
        this.setState({quick_select: this.ALL_PRODUCTS});

        const new_value = this.state.data.filter(d => d.level == 4).map(d => d.value);
        this.state.callback(new_value);
    }

    handleAllSectorsClicked() {
        this.setState({quick_select: this.ALL_SECTORS});

        const new_value = this.state.data.filter(d => d.level == 2).map(d => d.value);
        this.state.callback(new_value);
    }

    handleAllSubsectorsClicked() {
        this.setState({quick_select: this.ALL_SUBSECTORS});

        const new_value = this.state.data.filter(d => d.level == 3).map(d => d.value);
        this.state.callback(new_value);
    }
}

export default ProductFilterableMultiSelectDropdownTree;
