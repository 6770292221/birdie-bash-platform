export const removeMongoIds = (obj: any, visited = new WeakSet()): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Return primitive values as is
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj;
  }

  // Handle Buffer objects
  if (Buffer.isBuffer(obj)) {
    return obj;
  }

  // Check for circular references
  if (visited.has(obj)) {
    return obj;
  }
  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => removeMongoIds(item, visited));
  }

  // Handle plain objects
  if (obj.constructor === Object || obj.constructor === undefined) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== '_id') {
        cleaned[key] = removeMongoIds(value, visited);
      }
    }
    return cleaned;
  }

  // Return other object types as is (Functions, RegExp, etc.)
  return obj;
};