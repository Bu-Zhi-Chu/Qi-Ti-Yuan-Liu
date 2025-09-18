// Simple browser shim for Node's 'os' module providing only what libsquoosh needs.
// Currently libsquoosh calls os.cpus() to determine number of logical CPUs.
// We'll map it to navigator.hardwareConcurrency when available, otherwise return an empty array.

export function cpus() {
    const count = typeof navigator !== 'undefined' && navigator.hardwareConcurrency || 1
    // Return an array of dummy CPU objects with length equal to the count.
    return Array.from({ length: count }, () => ({ model: 'browser', speed: 0, times: {} }))
}

// Export any other stubs if necessary in future.
export default { cpus }