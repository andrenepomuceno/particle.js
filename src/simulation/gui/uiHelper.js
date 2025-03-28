import { UI } from '../../ui/App';

/**
 * Adds a UI control option that can be used across different GUI components
 * @param {Object} config Configuration object
 * @param {string} config.folder The folder name to group the control
 * @param {string} config.title The display title for the control
 * @param {string} config.variable The variable name to bind to in the options object
 * @param {Object} config.options The options object that holds the values
 * @param {string} config.component The UI component to add the control to (e.g. UI.controls, UI.info)
 * @param {Array} config.refreshCallbacks Array to store refresh callbacks
 * @param {function} [config.onFinishChange] Optional callback when value changes
 * @param {Object} [config.selectionList] Optional list of selections for dropdown
 * @returns {void}
 */
export function addUIOption({
    folder,
    title,
    variable,
    options,
    component,
    refreshCallbacks,
    onFinishChange,
    selectionList
}) {
    const defaultValue = options[variable];

    // If no callback provided, create default one that updates the option value
    if (onFinishChange === undefined) {
        onFinishChange = (val) => {
            options[variable] = val;
        };
    }

    const item = {
        title: title,
        value: defaultValue,
        onFinish: onFinishChange,
        selectionList: selectionList,
        folder: folder
    };

    UI.addItem(component, item);

    // Add refresh callback if value is not a function
    if (typeof defaultValue !== 'function') {
        refreshCallbacks.push(() => {
            item.value = options[variable];
        });
    }
}