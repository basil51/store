import { resolveHttpSecurityConfig } from '../../shared/security-config'

const baseInput = {
  storeCors: 'http://localhost:8000',
  adminCors: 'http://localhost:9244',
  authCors: 'http://localhost:9244,http://localhost:8000',
}

describe('resolveHttpSecurityConfig', () => {
  it('preserves explicitly configured strong secrets', () => {
    const config = resolveHttpSecurityConfig({
      ...baseInput,
      nodeEnv: 'development',
      jwtSecret: '5f50ebc6e7677b244de90d5d309cde927fb0a90ec424f712d58d81f629d6f34f',
      cookieSecret:
        'f2f66f3fd585d2d5daebef316b3ca56c84295faad2f4139660d3419878c6267d',
    })

    expect(config.jwtSecret).toBe(
      '5f50ebc6e7677b244de90d5d309cde927fb0a90ec424f712d58d81f629d6f34f'
    )
    expect(config.cookieSecret).toBe(
      'f2f66f3fd585d2d5daebef316b3ca56c84295faad2f4139660d3419878c6267d'
    )
  })

  it('replaces weak development secrets with strong non-production fallbacks', () => {
    const config = resolveHttpSecurityConfig({
      ...baseInput,
      nodeEnv: 'test',
      jwtSecret: 'supersecret',
      cookieSecret: 'secret',
    })

    expect(config.jwtSecret).not.toBe('supersecret')
    expect(config.cookieSecret).not.toBe('secret')
    expect(config.jwtSecret.length).toBeGreaterThanOrEqual(32)
    expect(config.cookieSecret.length).toBeGreaterThanOrEqual(32)
  })

  it('rejects weak production secrets', () => {
    expect(() =>
      resolveHttpSecurityConfig({
        ...baseInput,
        nodeEnv: 'production',
        jwtSecret: 'supersecret',
        cookieSecret:
          'f2f66f3fd585d2d5daebef316b3ca56c84295faad2f4139660d3419878c6267d',
      })
    ).toThrow(/JWT_SECRET/)

    expect(() =>
      resolveHttpSecurityConfig({
        ...baseInput,
        nodeEnv: 'production',
        jwtSecret: '5f50ebc6e7677b244de90d5d309cde927fb0a90ec424f712d58d81f629d6f34f',
        cookieSecret: 'supersecret',
      })
    ).toThrow(/COOKIE_SECRET/)
  })

  it('rejects missing CORS settings', () => {
    expect(() =>
      resolveHttpSecurityConfig({
        adminCors: baseInput.adminCors,
        authCors: baseInput.authCors,
        nodeEnv: 'development',
      })
    ).toThrow(/STORE_CORS/)
  })
})