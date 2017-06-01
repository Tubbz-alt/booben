/**
 * @author Dmitriy Bizyaev
 */

'use strict';

import { Record, List, Map } from 'immutable';

export const QueryPathStep = Record({
  field: '',
});

let nextAliasPostfix = 0;

const _SourceDataData = Record({
  dataContext: List(),
  queryPath: null,
  queryArgs: Map(),
  aliasPostfix: '',
});

export default class SourceDataData extends _SourceDataData {
  constructor(data) {
    super({
      ...data,
      aliasPostfix: String(nextAliasPostfix++),
    });
  }
}
