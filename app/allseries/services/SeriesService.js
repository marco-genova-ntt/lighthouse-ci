import * as R from 'ramda';
import * as utility from '../../utility';

class SeriesService {

    /**
     * 
     * @param {*} configuration 
     */
    constructor(configuration = {}) {
        this._configuration = R.clone(configuration);
        
        if (!this._configuration.path) {
            this._configuration.path = utility.string('SERIES_SERVICE_DATABASE_FILE', './tmp/database.json');   
        }
        
        console.info('Series database placed here:',this._configuration.path);
    }

    /**
     * Loads an existent database, otherwise creates it
     */
    loadDatabase () {
        const internalFile = this._configuration.path; 
        const database = utility.getJSONFromFile(internalFile);
        
        if (!database) {
            utility.writeJSONToFile(internalFile, {});
            return {};
        } 

        return database;
    }

    /**
     * Saves the database on file system.
     * 
     *  @param {Any} database 
     */
    saveDatabase (database) {
        if (database) {
            const internalFile = this._configuration.path;
            utility.writeJSONToFile(internalFile, database);
        }
        
        return database;
    }

    get validConfiguration() {
        return {...this._configuration};
    }
}

export default SeriesService;