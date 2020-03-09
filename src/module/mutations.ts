import { isArray, isFunction, isNumber } from 'is-what'
import { getDeepRef } from 'vuex-easy-access'
import logError from './errors'
import copy from 'copy-anything'
import { merge } from 'merge-anything'
import { AnyObject } from '../declarations'
import { isArrayHelper } from '../utils/arrayHelpers'
import { isIncrementHelper } from '../utils/incrementHelper'
import getStateWithSync from './state'
import get from 'lodash/get';

/**
 * a function returning the mutations object
 *
 * @export
 * @param {object} userState
 * @returns {AnyObject} the mutations object
 */
export default function (userState: object): AnyObject {
  return {
    SET_PATHVARS (state, pathVars) {
      const self = this
      Object.keys(pathVars).forEach(key => {
        const pathPiece = pathVars[key]
        self._vm.$set(state._sync.pathVariables, key, pathPiece)
      })
    },
    SET_SYNCCLAUSES (state, { where, orderBy }) {
      if (where && isArray(where)) state._conf.sync.where = where
      if (orderBy && isArray(orderBy)) state._conf.sync.orderBy = orderBy
    },
    SET_USER_ID (state, userId) {
      if (!userId) {
        state._sync.signedIn = false
        state._sync.userId = null
      } else {
        state._sync.signedIn = true
        state._sync.userId = userId
      }
    },
    CLEAR_USER (state) {
      state._sync.signedIn = false
      state._sync.userId = null
    },
    RESET_VUEX_EASY_FIRESTORE_STATE (state) {
      // unsubscribe all DBChannel listeners:
      Object.keys(state._sync.unsubscribe).forEach(unsubscribe => {
        if (isFunction(unsubscribe)) unsubscribe()
      })
      const self = this
      const { _sync } = getStateWithSync()
      const newState = merge(copy(userState), { _sync })
      const { statePropName } = state._conf
      const docContainer = statePropName ? state[statePropName] : state
      Object.keys(newState).forEach(key => {
        self._vm.$set(state, key, newState[key])
      })
      Object.keys(docContainer).forEach(key => {
        if (Object.keys(newState).includes(key)) return
        self._vm.$delete(docContainer, key)
      })
    },
    resetSyncStack (state) {
      const { _sync } = getStateWithSync()
      const { syncStack } = _sync
      state._sync.syncStack = syncStack
    },
    INSERT_DOC (state, doc) {
      if (state._conf.firestoreRefType.toLowerCase() !== 'collection') return
      if (state._conf.statePropName) {
        this._vm.$set(state[state._conf.statePropName], doc.id, doc)
      } else {
        this._vm.$set(state, doc.id, doc)
      }
    },
    PATCH_DOC (state, patches) {
      // Get the state prop ref
      let ref = state._conf.statePropName
        ? state[state._conf.statePropName]
        : state
      if (state._conf.firestoreRefType.toLowerCase() === 'collection') {
        ref = ref[patches.id]
      }
      if (!ref) return logError('patch-no-ref')

      function dotNotate(obj, target, prefix) {
        (target = target || {}), (prefix = prefix || '');
        Object.keys(obj).forEach(function(key) {
          // console.log('dot key', obj[key])
          const keyValue = obj[key];
          if (
            typeof keyValue === 'object' &&
            keyValue !== null &&
            !keyValue.seconds &&
            !keyValue.isIncrementHelper &&
            !isArray(keyValue) &&
            get(ref, prefix + key) // check if this object exists in vuex yet
          ) {
            dotNotate(obj[key], target, prefix + key + '.');
          } else {
            return (target[prefix + key] = obj[key]);
          }
        });
        return target;
      }
      //  convert to dot notation keys
      const dotPatches = dotNotate(patches, {}, '');
      const patchKeys = Object.keys(dotPatches);
      // console.log('patch keys', patchKeys);
      return patchKeys.forEach((k, n) => {
        if (n === 0) {
          //  first key is page id
          return;
        }
        const pathArray = k.split('.');
        const key = pathArray.pop();
        // console.log(pathArray);
        const updateObject = pathArray.length
          ? get(ref, pathArray)
          : ref;
        // console.log(updateObject);
        // console.log(key);
        let newVal = dotPatches[k];
        // console.log('new val from dot patches', newVal);
        const originalVal = updateObject[key];
        newVal = helpers(originalVal, newVal);
        // console.log('val after helpers', newVal);
        function helpers (originVal, newVal) {
          // console.log('newVal1', newVal)
          if (isArray(originVal) && isArrayHelper(newVal)) {
            newVal = newVal.executeOn(originVal)
          }
          if (isNumber(originVal) && isIncrementHelper(newVal)) {
            // console.log('new val before inc', newVal);
            newVal = newVal.executeOn(originVal)
            // console.log('after increment', newVal);
          }
          return newVal // always return newVal as fallback!!
        }
        // console.log('final val', newVal);
        this._vm.$set(updateObject, key, newVal);
      })
    },
    DELETE_DOC (state, id) {
      if (state._conf.firestoreRefType.toLowerCase() !== 'collection') return
      if (state._conf.statePropName) {
        this._vm.$delete(state[state._conf.statePropName], id)
      } else {
        this._vm.$delete(state, id)
      }
    },
    DELETE_PROP (state, path) {
      const searchTarget = state._conf.statePropName
        ? state[state._conf.statePropName]
        : state
      const propArr = path.split('.')
      const target = propArr.pop()
      if (!propArr.length) {
        return this._vm.$delete(searchTarget, target)
      }
      const ref = getDeepRef(searchTarget, propArr.join('.'))
      return this._vm.$delete(ref, target)
    }
  }
}
