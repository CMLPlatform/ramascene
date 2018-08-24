// @flow
import FilterableSingleSelectDropdownTree from './filterableSingleSelectDropdownTree';

class ConsumerFilterableSingleSelectDropdownTree extends FilterableSingleSelectDropdownTree {

    constructor(props) {
        super(props);
    }

    componentWillMount() {
        var data = [{id: 1, pId: 0, value: 'FinalConsumption', label: 'Final Consumption'}];
        this.setState({data: data, placeholder: "select consumer"});
    }

    getLabel(value) {
        var consumer = this.state.data.find(function(consumer) {
            return consumer.value == value;
        });
        return consumer.label;
    }
}

export default ConsumerFilterableSingleSelectDropdownTree;