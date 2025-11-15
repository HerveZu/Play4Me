const APP_VARIANT = process.env.APP_VARIANT

const getUniqueIdentifier = () => {
    const id = 'com.play4me'

    if (APP_VARIANT) {
        return `${id}.${APP_VARIANT.toLowerCase()}`
    }

    return id
}

const getAppName = () => {
    if (APP_VARIANT) {
        return `Play4Me (${APP_VARIANT})`
    }

    return 'Play4Me'
}

export default ({ config }) => ({
    ...config,
    name: getAppName(),
    ios: {
        ...config.ios,
        bundleIdentifier: getUniqueIdentifier(),
    },
    android: {
        ...config.android,
        package: getUniqueIdentifier(),
    },
})
