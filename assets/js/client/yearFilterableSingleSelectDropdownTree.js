// @flow
import FilterableSingleSelectDropdownTree from './filterableSingleSelectDropdownTree';

class YearFilterableSingleSelectDropdownTree extends FilterableSingleSelectDropdownTree {

    constructor(props) {
        super(props);
    }

    componentWillMount() {
        var data = [];
        var years = [2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000, 1999, 1998, 1997, 1996, 1995];
        for (var year of years) {
            data.push({id: year, pId: 0, value: year.toString(), label: year.toString()});
        }
        this.setState({data: data, placeholder: "Select year"});
    }
}

export default YearFilterableSingleSelectDropdownTree;
