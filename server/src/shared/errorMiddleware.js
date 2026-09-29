'use strict';

const { NotFoundError, ValidationError } = require('./errors');

function toNotFoundCode(resourceName) {
  return `${resourceName.toUpperCase()}_NOT_FOUND`;
}

function errorMiddleware(err, req, res, next) {
  if (err instanceof NotFoundError) {
    res.status(404).json({ code: toNotFoundCode(err.resourceName), message: err.message });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(422).json({ code: 'VALIDATION_ERROR', fields: err.fields });
    return;
  }

  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
}

module.exports = { errorMiddleware };
