// /src/store/index.ts
// Composes all Zustand slices

// Create a unified store using slices
// export const useStore = create<State>()((...a) => ({
//   ...createConnectionSlice(...a),
//   ...createQuerySlice(...a),
//   ...createSchemaSlice(...a),
//   ...createAccessSlice(...a),
// }))

// Keep backwards compat for useDatabaseStore
export * from './useDatabaseStore';
