// @flow
import shortid from 'shortid';
import {processVisualizationData} from './utils';

export class JobManager {
    constructor(scenarioCompRef) {
        this.scenarioCompRef = scenarioCompRef;
    }

    // Add a new job to the queue
    addJob(jobs, query, autoRender = false, detailLevel = null) {
        const newJob = {
            key: shortid.generate(),
            query: query,
            in_main_view: false,
            in_comparison_view: false,
            auto_render: autoRender,
            detailLevel: detailLevel || this.getDefaultDetailLevel()
        };
        return [...jobs, newJob];
    }

    // Find job by key
    findJob(jobs, key) {
        return jobs.find(job => job.key === key);
    }

    // Find index of job by key
    findJobIndex(jobs, key) {
        return jobs.findIndex(job => job.key === key);
    }

    // Remove job by key
    removeJob(jobs, key) {
        return jobs.filter(job => job.key !== key);
    }

    // Set job as in main view
    setMainViewJob(jobs, key, inMainView = true) {
        return jobs.map(job => {
            if (job.key === key) {
                return {...job, in_main_view: inMainView};
            }
            // Clear other jobs from main view
            if (inMainView && job.in_main_view) {
                return {...job, in_main_view: false};
            }
            return job;
        });
    }

    // Set job as in comparison view
    setComparisonViewJob(jobs, key, inComparisonView = true) {
        return jobs.map(job => {
            if (job.key === key) {
                return {...job, in_comparison_view: inComparisonView};
            }
            // Clear other jobs from comparison view
            if (inComparisonView && job.in_comparison_view) {
                return {...job, in_comparison_view: false};
            }
            return job;
        });
    }

    // Process tree data for visualization
    processTreeData(data) {
        const tree_data = [];
        Object.keys(data).forEach(function(key) {
            const value = data[key];
            tree_data.push({id: key, value: value});
        });
        return tree_data;
    }

    // Process geo data for visualization
    processGeoData(data) {
        const geo_data = [];
        Object.keys(data).forEach(function(key) {
            const value = data[key];
            geo_data.push({id: key, value: value});
        });
        return geo_data;
    }

    // Render visualization based on job data
    renderVisualization(data, unit, is_modelling_result, model_details, job, callback, containerId) {
        const new_model_details = processVisualizationData(
            data, model_details, is_modelling_result, this.scenarioCompRef
        );

        switch (job.query.vizType) {
            case 'tree':
                const tree_data = this.processTreeData(data);
                return {
                    type: 'tree',
                    data: tree_data,
                    unit: unit,
                    model_details: new_model_details,
                    query: job,
                    is_modelling_result: is_modelling_result,
                    callback: callback
                };
            case 'geo':
                const geo_data = this.processGeoData(data);
                return {
                    type: 'geo',
                    data: geo_data,
                    unit: unit,
                    model_details: new_model_details,
                    query: job,
                    is_modelling_result: is_modelling_result,
                    detailLevel: job.detailLevel,
                    callback: callback
                };
            default:
                return null;
        }
    }

    getDefaultDetailLevel() {
        // Default detail level - can be customized
        return 'country';
    }
}