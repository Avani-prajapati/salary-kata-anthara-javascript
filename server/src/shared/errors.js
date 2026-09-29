'use strict';

class NotFoundError extends Error {
  constructor(resourceName, id) {
    super(`${resourceName} ${id} was not found`);
    this.name = 'NotFoundError';
    this.resourceName = resourceName;
    this.id = id;
  }
}

class ValidationError extends Error {
  constructor(fields) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

module.exports = { NotFoundError, ValidationError };
