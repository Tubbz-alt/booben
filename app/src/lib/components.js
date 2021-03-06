import { Set, Map } from 'immutable';
import _forOwn from 'lodash.forown';
import { TypeNames } from 'booben-types';

import {
  getMutationField,
  getBoobenValueDefOfMutationArgument,
} from 'booben-graphql-schema';

import BoobenValue, {
  SourceDataDesigner,
  Action,
  ActionTypes,
  isAsyncAction,
} from '../models/BoobenValue';

import {
  getComponentMeta,
  parseComponentName,
  formatComponentName,
  constructComponent,
} from './meta';

import { getFunctionInfo } from './functions';
import { expandPath } from './path';
import { mapListToArray } from '../utils/misc';

import {
  SYSTEM_PROPS,
  ROUTE_PARAM_VALUE_DEF,
  INVALID_ID,
} from '../constants/misc';

/**
 *
 * @param {Object} component
 * @return {string}
 */
export const formatComponentTitle = component =>
  component.title || component.name;

/**
 *
 * @param {string} componentName
 * @param {ComponentsMeta} meta
 * @return {boolean}
 */
export const canInsertRootComponent = (componentName, meta) => {
  const componentMeta = getComponentMeta(componentName, meta);
  return !componentMeta.placement || componentMeta.placement.root !== 'deny';
};

/**
 *
 * @type {number}
 */
export const ANYWHERE = -2;

/**
 *
 * @param {string} componentName
 * @param {Immutable.Map<number, Object>} components
 * @param {number} containerId
 * @param {number} afterIdx - -1 = before first child; ANYWHERE = well, anywhere :)
 * @param {ComponentsMeta} meta
 * @return {boolean}
 */
export const canInsertComponent = (
  componentName,
  components,
  containerId,
  afterIdx,
  meta,
) => {
  const componentMeta = getComponentMeta(componentName, meta);

  const mustBeRoot =
    !!componentMeta.placement &&
    componentMeta.placement.root === 'only';

  if (mustBeRoot) return false;

  const container = components.get(containerId);
  const containerMeta = getComponentMeta(container.name, meta);
  if (containerMeta.kind !== 'container') return false;

  if (!componentMeta.placement) return true;

  const { namespace } = parseComponentName(componentName);
  const { namespace: containerNamespace } = parseComponentName(container.name);
  const sameNamespace = containerNamespace === namespace;

  if (sameNamespace && componentMeta.placement.inside) {
    if (componentMeta.placement.inside.include) {
      const containerChildrenNames = mapListToArray(
        container.children,
        childId => components.get(childId).name,
      );

      const sameComponentsNum = containerChildrenNames
        .reduce((acc, cur) => acc + (cur === componentName ? 1 : 0), 0);

      const allow = componentMeta.placement.inside.include.some(inclusion => {
        if (inclusion.component) {
          const inclusionComponentName = formatComponentName(
            namespace,
            inclusion.component,
          );

          if (container.name !== inclusionComponentName) return false;
        } else if (inclusion.group) {
          if (containerMeta.group !== inclusion.group) return false;
        } else if (inclusion.tag) {
          if (!containerMeta.tags.has(inclusion.tag)) return false;
        }

        return !inclusion.maxNum || sameComponentsNum < inclusion.maxNum;
      });

      if (!allow) return false;
    }

    if (componentMeta.placement.inside.exclude) {
      const deny = componentMeta.placement.inside.exclude.some(exclusion => {
        if (exclusion.component) {
          const exclusionComponentName = formatComponentName(
            namespace,
            exclusion.component,
          );

          return container.name === exclusionComponentName;
        } else if (exclusion.group) {
          return containerMeta.group === exclusion.group;
        } else if (exclusion.tag) {
          return containerMeta.tags.has(exclusion.tag);
        } else {
          return false;
        }
      });

      if (deny) return false;
    }
  }

  // TODO: Check before and after constraints

  return true;
};

/**
 *
 * @param {string} componentName
 * @param {Immutable.Map<number, Object>} components
 * @param {number} rootId
 * @param {ComponentsMeta} meta
 * @return {boolean}
 */
export const canInsertComponentIntoTree = (
  componentName,
  components,
  rootId,
  meta,
) => {
  const rootComponent = components.get(rootId);

  const canInsert = canInsertComponent(
    componentName,
    components,
    rootId,
    ANYWHERE,
    meta,
  );

  if (canInsert) return true;

  return rootComponent.children.some(childId => canInsertComponentIntoTree(
    componentName,
    components,
    childId,
    meta,
  ));
};

/**
 *
 * @param {Object} component
 * @return {boolean}
 */
export const isRootComponent = component => component.parentId === INVALID_ID;

/**
 *
 * @param {Immutable.Map<number, Object>} components
 * @param {number} componentId
 * @param {number} containerId
 * @return {boolean}
 */
export const isDeepChild = (components, componentId, containerId) => {
  const component = components.get(componentId);

  let parentId = component.parentId;
  while (parentId !== INVALID_ID) {
    if (parentId === containerId) return true;
    parentId = components.get(parentId).parentId;
  }

  return false;
};

/**
 *
 * @param {Immutable.Map<number, Object>} components
 * @param {number} componentId
 * @param {number} containerId
 * @param {number} afterIdx
 * @param {ComponentsMeta} meta
 * @return {boolean}
 */
export const canMoveComponent = (
  components,
  componentId,
  containerId,
  afterIdx,
  meta,
) =>
  componentId !== containerId &&
  !isDeepChild(components, containerId, componentId) &&
  canInsertComponent(
    components.get(componentId).name,
    components,
    containerId,
    afterIdx,
    meta,
  );

/**
 *
 * @param {Immutable.Map<number, Object>} components
 * @param {number} rootComponentId
 * @param {function(component: Object)} visitor
 */
export const walkComponentsTree = (components, rootComponentId, visitor) => {
  const BREAK = walkComponentsTree.BREAK;
  let didBreak = false;

  const visitComponent = component => {
    const visitorRet = visitor(component);

    if (visitorRet === BREAK) {
      didBreak = true;
      return;
    }

    // eslint-disable-next-line consistent-return
    component.children.forEach(childId => {
      visitComponent(components.get(childId));

      if (didBreak) {
        return false;
      }
    });
  };

  visitComponent(components.get(rootComponentId));
  return { didBreak };
};

walkComponentsTree.BREAK = Object.freeze(Object.create(null));

/**
 *
 * @param {Immutable.Map<number, Object>} components
 * @param {number} rootComponentId
 * @param {function(component: Object): boolean} predicate
 * @return {?Object}
 */
export const findComponent = (components, rootComponentId, predicate) => {
  if (rootComponentId === INVALID_ID) return null;

  const component = components.get(rootComponentId);

  if (predicate(component)) {
    return component;
  } else {
    let found = null;

    component.children.forEach(id => {
      found = findComponent(components, id, predicate);
      return found === null;
    });

    return found;
  }
};

/**
 *
 * @param {Immutable.Map<number, Object>} components
 * @param {number} rootComponentId
 * @return {Immutable.Set<number>}
 */
export const gatherComponentsTreeIds = (
  components,
  rootComponentId,
) => Set().withMutations(ret => void walkComponentsTree(
  components,
  rootComponentId,
  component => void ret.add(component.id),
));

/**
 *
 * @param {Object} component
 * @param {ComponentMeta} componentMeta
 * @param {function(node: Object, valueDef: ?BoobenValueDefinition, steps: (string|number)[], isSystemProp: boolean )} visitor
 * @param {boolean} [walkSystemProps=false]
 * @param {boolean} [walkDesignerValues=false]
 * @param {?Object<string, Object<string, ComponentMeta>>} [meta=null]
 * @param {boolean} [walkFunctionArgs=false]
 * @param {?Object} [project=null]
 * @param {boolean} [walkActions=false]
 * @param {?Object} [schema=null]
 * @param {boolean} [visitIntermediateNodes=false]
 * @param {(string|number)[]} [_pathPrefix=[]]
 */
export const walkSimpleValues = (
  component,
  componentMeta,
  visitor,
  {
    walkSystemProps = false,
    walkDesignerValues = false,
    meta = null,
    walkFunctionArgs = false,
    project = null,
    walkActions = false,
    schema = null,
    visitIntermediateNodes = false,
  } = {},
  _pathPrefix = [],
) => {
  if (walkFunctionArgs && !project) {
    throw new Error(
      'walkSimpleProps(): walkFunctionArgs is true, but there\'s no project',
    );
  }

  if (walkActions && !schema) {
    throw new Error(
      'walkSimpleProps(): walkActions is true, but there\'s no schema',
    );
  }

  if (walkDesignerValues && !meta) {
    throw new Error(
      'walkSimpleProps(): walkDesignerValues is true, but there\'s no meta',
    );
  }

  const options = {
    walkSystemProps,
    walkDesignerValues,
    meta,
    walkFunctionArgs,
    project,
    walkActions,
    schema,
    visitIntermediateNodes,
  };

  const SKIP = walkSimpleValues.SKIP;
  const BREAK = walkSimpleValues.BREAK;

  let didBreak = false;

  /* eslint-disable no-use-before-define, consistent-return */
  const visitAction = (action, path, isSystemProp) => {
    if (visitIntermediateNodes) {
      const visitorRet = visitor(action, null, path, isSystemProp);
      if (visitorRet === SKIP) return;
      if (visitorRet === BREAK) {
        didBreak = true;
        return;
      }
    }

    if (action.type === ActionTypes.MUTATION) {
      const mutationField = getMutationField(schema, action.params.mutation);

      action.params.args.forEach((argValue, argName) => {
        const argValueDef = getBoobenValueDefOfMutationArgument(
          mutationField.args[argName],
          schema,
        );

        visitValue(
          argValue,
          argValueDef,
          [...path, 'args', argName],
          isSystemProp,
        );

        if (didBreak) {
          return false;
        }
      });
    } else if (action.type === ActionTypes.METHOD) {
      const methodMeta = componentMeta.methods[action.para.method];

      action.params.args.forEach((argValue, argIdx) => {
        const argValueDef = methodMeta.args[argIdx];

        visitValue(
          argValue,
          argValueDef,
          [...path, 'args', argIdx],
          isSystemProp,
        );

        if (didBreak) {
          return false;
        }
      });
    } else if (action.type === ActionTypes.NAVIGATE) {
      action.params.routeParams.forEach((paramValue, paramName) => {
        visitValue(
          paramValue,
          ROUTE_PARAM_VALUE_DEF,
          [...path, 'routeParams', paramName],
          isSystemProp,
        );

        if (didBreak) {
          return false;
        }
      });
    } else if (action.type === ActionTypes.PROP) {
      // TODO: Visit value?
    }

    if (isAsyncAction(action.type)) {
      action.params.successActions.forEach((action, actionIdx) => {
        visitAction(
          action,
          [...path, 'successActions', actionIdx],
          isSystemProp,
        );

        if (didBreak) {
          return false;
        }
      });

      action.params.errorActions.forEach((action, actionIdx) => {
        visitAction(
          action,
          [...path, 'errorActions', actionIdx],
          isSystemProp,
        );

        if (didBreak) {
          return false;
        }
      });
    }
  };

  const visitValue = (boobenValue, valueDef, path, isSystemProp) => {
    if (boobenValue.sourceIs(BoobenValue.Source.STATIC)) {
      if (
        valueDef.type === TypeNames.SHAPE &&
        boobenValue.sourceData.value !== null
      ) {
        if (visitIntermediateNodes) {
          const visitorRet = visitor(boobenValue, valueDef, path, isSystemProp);
          if (visitorRet === SKIP) return;
          if (visitorRet === BREAK) {
            didBreak = true;
            return;
          }
        }

        _forOwn(valueDef.fields, (fieldTypedef, fieldName) => {
          const fieldValue = boobenValue.sourceData.value.get(fieldName);

          if (fieldValue) {
            visitValue(
              fieldValue,
              fieldTypedef,
              [...path, fieldName],
              isSystemProp,
            );

            if (didBreak) {
              return false;
            }
          }
        });
      } else if (
        valueDef.type === TypeNames.OBJECT_OF &&
        boobenValue.sourceData.value !== null
      ) {
        if (visitIntermediateNodes) {
          const visitorRet = visitor(boobenValue, valueDef, path, isSystemProp);
          if (visitorRet === SKIP) return;
          if (visitorRet === BREAK) {
            didBreak = true;
            return;
          }
        }

        boobenValue.sourceData.value.forEach((fieldValue, key) => {
          visitValue(
            fieldValue,
            valueDef.ofType,
            [...path, key],
            isSystemProp,
          );

          if (didBreak) {
            return false;
          }
        });
      } else if (valueDef.type === TypeNames.ARRAY_OF) {
        if (visitIntermediateNodes) {
          const visitorRet = visitor(boobenValue, valueDef, path, isSystemProp);
          if (visitorRet === SKIP) return;
          if (visitorRet === BREAK) {
            didBreak = true;
            return;
          }
        }

        boobenValue.sourceData.value.forEach((itemValue, idx) => {
          visitValue(
            itemValue,
            valueDef.ofType,
            [...path, idx],
            isSystemProp,
          );

          if (didBreak) {
            return false;
          }
        });
      } else {
        const visitorRet = visitor(boobenValue, valueDef, path, isSystemProp);
        if (visitorRet === BREAK) {
          didBreak = true;
        }
      }
    } else if (
      walkFunctionArgs &&
      boobenValue.sourceIs(BoobenValue.Source.FUNCTION)
    ) {
      if (visitIntermediateNodes) {
        const visitorRet = visitor(boobenValue, valueDef, path, isSystemProp);
        if (visitorRet === SKIP) return;
        if (visitorRet === BREAK) {
          didBreak = true;
          return;
        }
      }

      const fnInfo = getFunctionInfo(
        boobenValue.sourceData.functionSource,
        boobenValue.sourceData.function,
        project.functions,
      );

      fnInfo.args.forEach(argInfo => {
        const argName = argInfo.name;
        const argValue = boobenValue.sourceData.args.get(argInfo.name);

        if (argValue) {
          visitValue(
            argValue,
            argInfo.typedef,
            [...path, 'args', argName],
            isSystemProp,
          );
        }

        if (didBreak) return false;
      });
    } else if (walkActions && boobenValue.sourceIs(BoobenValue.Source.ACTIONS)) {
      if (visitIntermediateNodes) {
        const visitorRet = visitor(boobenValue, valueDef, path, isSystemProp);
        if (visitorRet === SKIP) return;
        if (visitorRet === BREAK) {
          didBreak = true;
          return;
        }
      }

      boobenValue.sourceData.actions.forEach((action, actionIdx) => {
        visitAction(action, [...path, 'actions', actionIdx], isSystemProp);
        if (didBreak) return false;
      });
    } else if (
      walkDesignerValues &&
      boobenValue.sourceIs(BoobenValue.Source.DESIGNER)
    ) {
      if (visitIntermediateNodes) {
        const visitorRet = visitor(boobenValue, valueDef, path, isSystemProp);
        if (visitorRet === SKIP) return;
        if (visitorRet === BREAK) {
          didBreak = true;
          return;
        }
      }

      const components = boobenValue.sourceData.components;
      const rootId = boobenValue.sourceData.rootId;

      if (rootId !== INVALID_ID) {
        walkComponentsTree(components, rootId, component => {
          const componentMeta = getComponentMeta(component.name, meta);
          const pathPrefix = [...path, 'components', component.id];

          const walkRet = walkSimpleValues(
            component,
            componentMeta,
            visitor,
            options,
            pathPrefix,
          );

          if (walkRet.didBreak) {
            didBreak = true;
            return walkComponentsTree.BREAK;
          }
        });
      }
    } else {
      const visitorRet = visitor(boobenValue, valueDef, path, isSystemProp);
      if (visitorRet === BREAK) {
        didBreak = true;
      }
    }
  };
  /* eslint-enable no-use-before-define */

  component.props.forEach((propValue, propName) => {
    visitValue(
      propValue,
      componentMeta.props[propName],
      [..._pathPrefix, 'props', propName],
    );

    if (didBreak) {
      return false;
    }
  });

  if (walkSystemProps) {
    component.systemProps.forEach((propValue, propName) => {
      visitValue(
        propValue,
        SYSTEM_PROPS[propName],
        [..._pathPrefix, 'systemProps', propName],
      );

      if (didBreak) {
        return false;
      }
    });
  }

  return { didBreak };
};

walkSimpleValues.SKIP = Object.freeze(Object.create(null));
walkSimpleValues.BREAK = Object.freeze(Object.create(null));

/**
 *
 * @param {Immutable.Map<number, Object>} components
 * @param {number} rootId
 * @param {ComponentsMeta} meta
 * @param {Object} project
 * @param {DataSchema} schema
 * @param {boolean} [setIsNewFlag=true]
 * @param {boolean} [clearExternalRefs=false]
 * @return {Immutable.Map<number, Object>}
 */
export const makeDetachedCopy = (
  components,
  rootId,
  meta,
  project,
  schema,
  {
    setIsNewFlag = true,
    clearExternalRefs = false,
  } = {},
) => Map().withMutations(ret => {
  const subtreeIds = gatherComponentsTreeIds(components, rootId);

  let idsMap = Map();
  let nextId = 0;

  const transformId = id => {
    if (idsMap.has(id)) {
      return idsMap.get(id);
    } else {
      const newId = nextId++;
      idsMap = idsMap.set(id, newId);
      return newId;
    }
  };

  walkComponentsTree(components, rootId, component => {
    const isRoot = component.id === rootId;
    const componentMeta = getComponentMeta(component.name, meta);
    const actionsToClear = [];
    const actionsToTransform = [];
    const boobenValuesToClear = [];
    const boobenValuesToTransform = [];

    const visitor = (node, valueDef, steps, isSystemProp) => {
      if (node instanceof Action) {
        if (
          node.type === ActionTypes.METHOD ||
          node.type === ActionTypes.PROP
        ) {
          const targetId = node.params.componentId;

          if (targetId !== INVALID_ID) {
            const arr = subtreeIds.has(targetId)
              ? actionsToTransform
              : actionsToClear;

            arr.push([isSystemProp ? 'systemProps' : 'props', ...steps]);
          }
        }
      } else if (node instanceof BoobenValue) {
        if (node.sourceIs(BoobenValue.Source.STATE)) {
          const targetId = node.sourceData.componentId;

          if (targetId !== INVALID_ID) {
            const arr = subtreeIds.has(targetId)
              ? boobenValuesToTransform
              : boobenValuesToClear;

            arr.push([isSystemProp ? 'systemProps' : 'props', ...steps]);
          }
        }
      }
    };

    const options = {
      meta,
      schema,
      project,
      walkSystemProps: true,
      walkDesignerValues: false,
      walkFunctionArgs: true,
      walkActions: true,
      visitIntermediateNodes: true,
    };

    walkSimpleValues(component, componentMeta, visitor, options);

    const start = {
      object: component,
      expandedPath: [],
    };

    if (clearExternalRefs) {
      actionsToClear.forEach(steps => {
        component = component.updateIn(
          expandPath({ start, steps }),
          action => action.setIn(['params', 'componentId'], INVALID_ID),
        );
      });

      boobenValuesToClear.forEach(steps => {
        component = component.updateIn(
          expandPath({ start, steps }),
          boobenValue => boobenValue.setIn(
            ['sourceData', 'componentId'],
            INVALID_ID,
          ),
        );
      });
    }

    actionsToTransform.forEach(steps => {
      component = component.updateIn(
        expandPath({ start, steps }),
        action => action.updateIn(['params', 'componentId'], transformId),
      );
    });

    boobenValuesToTransform.forEach(steps => {
      component = component.updateIn(
        expandPath({ start, steps }),
        boobenValue => boobenValue.updateIn(
          ['sourceData', 'componentId'],
          transformId,
        ),
      );
    });

    component = component.merge({
      id: transformId(component.id),
      parentId: isRoot ? INVALID_ID : transformId(component.parentId),
      isNew: setIsNewFlag,
      routeId: INVALID_ID,
      isIndexRoute: false,
      children: component.children.map(transformId),
    });

    ret.set(component.id, component);
  });
});

/**
 *
 * @param {Immutable.Map<number, Object>} components
 * @param {number} rootId
 * @param {ComponentsMeta} meta
 * @param {Object} project
 * @param {DataSchema} schema
 * @return {Immutable.Map<number, Object>}
 */
export const convertComponentToList = (
  components,
  rootId,
  meta,
  project,
  schema,
) => {
  const list = constructComponent('List');
  const designerValue = new BoobenValue({
    source: 'designer',
    sourceData: new SourceDataDesigner({
      components: makeDetachedCopy(
        components,
        rootId,
        meta,
        project,
        schema,
        { setIsNewFlag: false, clearExternalRefs: true },
      ),
      rootId: 0,
    }),
  });

  return list.setIn([0, 'props', 'component'], designerValue);
};

/**
 *
 * @param {Immutable.Map<number, Object>} components
 * @param {number} componentId
 * @return {{ containerId: number, afterIdx: number }}
 */
export const getComponentPosition = (components, componentId) => {
  const component = components.get(componentId);

  if (component.parentId === INVALID_ID) {
    return {
      containerId: INVALID_ID,
      afterIdx: -1,
    };
  }

  const container = components.get(component.parentId);
  const position = container.children.indexOf(componentId);

  return {
    containerId: container.id,
    afterIdx: position - 1,
  };
};
