// @flow
import FilterableSingleSelectDropdownTree from './filterableSingleSelectDropdownTree';

class YearFilterableSingleSelectDropdownTree extends FilterableSingleSelectDropdownTree {

    constructor(props) {
        super(props);
    }

    componentWillMount() {
        var data = [];
        var years = [1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011];
        for (var year of years) {
            data.push({id: year, pId: 0, value: year.toString(), label: year.toString()});
        }
        this.setState({data: data, placeholder: "select year"});
    }
}

export default YearFilterableSingleSelectDropdownTree;