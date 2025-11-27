export function flattenObject(obj, prefix = '', res = {}) {
    for (const key in obj) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            !(value instanceof Map)
        ) {
            flattenObject(value, newKey, res);
        } else {
            res[newKey] = value;
        }
    }
    return res;
}