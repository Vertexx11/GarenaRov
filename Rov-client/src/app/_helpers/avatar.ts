const _defaulAvatar = '/assets/anonymous_128.png'

export const getAvatar = (url: string | undefined) => {
    if (url) return url
        return _defaulAvatar
}