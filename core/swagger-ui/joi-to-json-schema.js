"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

/**
 * Converts the supplied joi validation object into a JSON schema object,
 * optionally applying a transformation.
 *
 * @param {JoiValidation} joi
 * @param {TransformFunction} [transformer=null]
 * @returns {JSONSchema}
 */
module.exports = convert;
var assert = _interopRequire(require("assert"));

// Converter helpers for Joi types.

var TYPES = {

  alternatives: function (schema, joi) {
    var result = schema.oneOf = [];

    joi._inner.matches.forEach(function (match) {
      if (match.schema) {
        return result.push(convert(match.schema));
      }

      if (!match.is) {
        throw new Error("joi.when requires an \"is\"");
      }
      if (!(match.then || match.otherwise)) {
        throw new Error("joi.when requires one or both of \"then\" and \"otherwise\"");
      }

      if (match.then) {
        result.push(convert(match.then));
      }

      if (match.otherwise) {
        result.push(convert(match.otherwise));
      }
    });
    return schema;
  },

  date: function (schema) {
    schema.type = "string";
    schema.format = "date-time";
    return schema;
  },

  any: function (schema) {
    schema.type = ["array", "boolean", "number", "object", "string", "null"];
    return schema;
  },

  array: function (schema, joi) {
    schema.type = "array";

    joi._tests.forEach(function (test) {
      switch (test.name) {
        case "unique":
          schema.uniqueItems = true;
          break;
        case "length":
          schema.minItems = schema.maxItems = test.arg;
          break;
        case "min":
          schema.minItems = test.arg;
          break;
        case "max":
          schema.maxItems = test.arg;
          break;
      }
    });

    if (joi._inner) {
      var list = undefined;
      if (joi._inner.inclusions.length) {
        list = joi._inner.inclusions;
      } else if (joi._inner.requireds.length) {
        list = joi._inner.requireds;
      }

      if (list) {
        schema.items = schema.items || {};
        list.forEach(function (i) {
          schema.items = convert(i);
        });
      }
    }

    return schema;
  },

  boolean: function (schema) {
    schema.type = "boolean";
    return schema;
  },

  number: function (schema, joi) {
    schema.type = "number";
    joi._tests.forEach(function (test) {
      switch (test.name) {
        case "integer":
          schema.type = "integer";
          break;
        case "less":
          schema.exclusiveMaximum = true;
          schema.maximum = test.arg;
          break;
        case "greater":
          schema.exclusiveMinimum = true;
          schema.minimum = test.arg;
          break;
        case "min":
          schema.minimum = test.arg;
          break;
        case "max":
          schema.maximum = test.arg;
          break;
      }
    });
    return schema;
  },

  string: function (schema, joi) {
    schema.type = "string";

    joi._tests.forEach(function (test) {
      switch (test.name) {
        case "email":
          schema.format = "email";
          break;
        case "regex":
          schema.pattern = String(test.arg).replace(/^\//, "").replace(/\/$/, "");
          break;
        case "min":
          schema.minLength = test.arg;
          break;
        case "max":
          schema.maxLength = test.arg;
          break;
        case "length":
          schema.minLength = schema.maxLength = test.arg;
          break;
        case "uri":
          schema.format = "uri";
          break;
      }
    });

    return schema;
  },

  object: function (schema, joi) {
    schema.type = "object";
    schema.properties = {};
    schema.additionalProperties = joi._flags.allowUnknown || false;

    if (!joi._inner.children) {
      return schema;
    }

    joi._inner.children.forEach(function (property) {
      if (property.schema._flags.presence !== "forbidden") {
        schema.properties[property.key] = convert(property.schema);
        if (property.schema._flags.presence === "required") {
          schema.required = schema.required || [];
          schema.required.push(property.key);
        }
      }
    });

    return schema;
  }
};function convert(joi) {
  var transformer = arguments[1] === undefined ? null : arguments[1];


  assert("object" === typeof joi && true === joi.isJoi, "requires a joi schema object");

  assert(joi._type, "joi schema object must have a type");

  if (!TYPES[joi._type]) {
    throw new Error("sorry, do not know how to convert unknown joi type: \"" + joi._type + "\"");
  }

  if (transformer) {
    assert("function" === typeof transformer, "transformer must be a function");
  }

  // JSON Schema root for this type.
  var schema = {};

  // Copy over the details that all schemas may have...
  if (joi._description) {
    schema.description = joi._description;
  }

  // Add the label as a title if it exists
  if (joi._settings && joi._settings.language && joi._settings.language.label) {
    schema.title = joi._settings.language.label;
  }

  if (joi._flags && joi._flags["default"]) {
    schema["default"] = joi._flags["default"];
  }

  if (joi._valids && joi._valids._set && joi._valids._set.length) {
    if (Array.isArray(joi._inner.children)) {
      return {
        "------oneOf": [{
          type: joi._type,
          "enum": joi._valids._set
        }, TYPES[joi._type](schema, joi)]
      };
    }
    schema["enum"] = joi._valids._set;
  }

  var result = TYPES[joi._type](schema, joi);

  if (transformer) {
    result = transformer(result);
  }

  return result;
}

/**
 * Joi Validation Object
 * @typedef {object} JoiValidation
 */

/**
 * Transformation Function - applied just before `convert()` returns and called as `function(object):object`
 * @typedef {function} TransformFunction
 */

/**
 * JSON Schema Object
 * @typedef {object} JSONSchema
 */
//# sourceMappingURL=joi-to-json-schema.js.map