import { writable } from 'svelte/store';

type DataMappingKeys = {
    [nodeId: string]: string[];
};

const { subscribe, update, set } = writable<DataMappingKeys>({});

export const dataMappingKeysStore = {
    subscribe,
    setKeys: (nodeId: string, keys: string[]) => {
        update(store => {
            store[nodeId] = keys;
            return store;
        });
    },
    clearKeys: (nodeId: string) => {
        update(store => {
            delete store[nodeId];
            return store;
        });
    },
    clearAll: () => {
        set({});
    }
};