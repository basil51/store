import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

jest.mock('../../../../../../shared/search-analytics', () => ({
  SEARCH_ANALYTICS_TABLE: 'search_analytics_events',
  SEARCH_RECOVERY_OVERRIDE_TABLE: 'search_recovery_overrides',
  ensureSearchAnalyticsTable: jest.fn(),
  ensureSearchRecoveryOverrideTable: jest.fn(),
  normalizeSearchQueryForAnalytics: jest.fn(),
  selectSearchRecoveryOverride: jest.fn(),
  rankSearchRecoveryCandidates: jest.fn(),
}))

const searchAnalytics = jest.requireMock('../../../../../../shared/search-analytics') as {
  ensureSearchAnalyticsTable: jest.Mock
  ensureSearchRecoveryOverrideTable: jest.Mock
  normalizeSearchQueryForAnalytics: jest.Mock
  selectSearchRecoveryOverride: jest.Mock
  rankSearchRecoveryCandidates: jest.Mock
}

import { GET } from "../route"

type Row = Record<string, unknown>

const createQuery = (rows: Row[]) => {
  const chain: any = {
    where: jest.fn((...args: unknown[]) => {
      const [first] = args

      if (typeof first === 'function') {
        first(chain)
      }

      return chain
    }),
    whereNull: jest.fn(() => chain),
    orWhereNull: jest.fn(() => chain),
    whereBetween: jest.fn(() => chain),
    whereNot: jest.fn(() => chain),
    modify: jest.fn((callback: (builder: any) => void) => {
      callback(chain)
      return chain
    }),
    select: jest.fn(() => chain),
    min: jest.fn(() => chain),
    count: jest.fn(() => chain),
    avg: jest.fn(() => chain),
    sum: jest.fn(() => chain),
    groupBy: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: (resolve: (value: Row[]) => unknown, reject?: (error: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  }

  return chain
}

const createDb = ({
  overrideRows = [],
  candidateRows = [],
}: {
  overrideRows?: Row[]
  candidateRows?: Row[]
}) => {
  const db: any = jest.fn((table: string) => {
    if (table === 'search_recovery_overrides') {
      return createQuery(overrideRows)
    }

    if (table === 'search_analytics_events') {
      return createQuery(candidateRows)
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  db.raw = jest.fn((sql: string) => sql)

  return db
}

const createRes = () => {
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  }

  return res
}

describe('GET /store/analytics/search/recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    searchAnalytics.ensureSearchAnalyticsTable.mockResolvedValue(undefined)
    searchAnalytics.ensureSearchRecoveryOverrideTable.mockResolvedValue(undefined)
    searchAnalytics.normalizeSearchQueryForAnalytics.mockImplementation((value?: string | null) => {
      if (!value) {
        return ''
      }

      return String(value).trim().toLowerCase().replace(/\s+/g, ' ')
    })
    searchAnalytics.selectSearchRecoveryOverride.mockReturnValue(null)
    searchAnalytics.rankSearchRecoveryCandidates.mockReturnValue([])
  })

  it('returns 400 when q normalizes to an empty value', async () => {
    const db = createDb({})
    const req: any = {
      query: { q: '   ' },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === ContainerRegistrationKeys.PG_CONNECTION) {
            return db
          }

          throw new Error(`Unexpected key: ${key}`)
        }),
      },
    }
    const res = createRes()

    await GET(req, res)

    expect(searchAnalytics.ensureSearchAnalyticsTable).toHaveBeenCalledWith(db)
    expect(searchAnalytics.ensureSearchRecoveryOverrideTable).toHaveBeenCalledWith(db)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'q is required.' })
  })

  it('prefers a distinct override and removes duplicate analytics candidates', async () => {
    const db = createDb({
      overrideRows: [
        {
          id: 1,
          query: 'labtop',
          normalized_query: 'labtop',
          target_query: 'Gaming Laptop',
          target_normalized_query: 'gaming laptop',
          locale: 'en',
          country_code: 'us',
          note: 'merchant override',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        },
      ],
      candidateRows: [
        {
          query: 'Gaming Laptop',
          normalized_query: 'gaming laptop',
          result_views: '24',
          average_results: '6',
          zero_result_views: '0',
        },
      ],
    })
    searchAnalytics.selectSearchRecoveryOverride.mockReturnValue({
      targetQuery: 'Gaming Laptop',
      targetNormalizedQuery: 'gaming laptop',
    })
    searchAnalytics.rankSearchRecoveryCandidates.mockReturnValue([
      {
        query: 'Gaming Laptop',
        normalizedQuery: 'gaming laptop',
        score: 0.95,
        resultViews: 24,
        averageResults: 6,
      },
      {
        query: 'Laptop Stand',
        normalizedQuery: 'laptop stand',
        score: 0.62,
        resultViews: 11,
        averageResults: 3,
      },
    ])

    const req: any = {
      query: { q: 'Labtop', locale: 'en', country_code: 'us', limit: '2', days: '30' },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === ContainerRegistrationKeys.PG_CONNECTION) {
            return db
          }

          throw new Error(`Unexpected key: ${key}`)
        }),
      },
    }
    const res = createRes()

    await GET(req, res)

    expect(searchAnalytics.selectSearchRecoveryOverride).toHaveBeenCalledWith(
      'labtop',
      expect.any(Array),
      { locale: 'en', countryCode: 'us' }
    )
    expect(searchAnalytics.rankSearchRecoveryCandidates).toHaveBeenCalledWith(
      'labtop',
      [
        {
          query: 'Gaming Laptop',
          normalizedQuery: 'gaming laptop',
          resultViews: 24,
          averageResults: 6,
          zeroResultViews: 0,
        },
      ],
      2
    )
    expect(res.json).toHaveBeenCalledWith({
      query: 'Labtop',
      normalized_query: 'labtop',
      recovery_queries: [
        {
          query: 'Gaming Laptop',
          normalized_query: 'gaming laptop',
          score: 1,
          result_views: 0,
          average_results: 0,
          source: 'override',
        },
        {
          query: 'Laptop Stand',
          normalized_query: 'laptop stand',
          score: 0.62,
          result_views: 11,
          average_results: 3,
          source: 'analytics',
        },
      ],
    })
  })

  it('filters no-op overrides whose target normalizes to the original query', async () => {
    const db = createDb({})
    searchAnalytics.selectSearchRecoveryOverride.mockReturnValue({
      targetQuery: ' Labtop ',
      targetNormalizedQuery: 'labtop',
    })
    searchAnalytics.rankSearchRecoveryCandidates.mockReturnValue([
      {
        query: 'Laptop',
        normalizedQuery: 'laptop',
        score: 0.58,
        resultViews: 17,
        averageResults: 4,
      },
    ])

    const req: any = {
      query: { q: 'Labtop' },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === ContainerRegistrationKeys.PG_CONNECTION) {
            return db
          }

          throw new Error(`Unexpected key: ${key}`)
        }),
      },
    }
    const res = createRes()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith({
      query: 'Labtop',
      normalized_query: 'labtop',
      recovery_queries: [
        {
          query: 'Laptop',
          normalized_query: 'laptop',
          score: 0.58,
          result_views: 17,
          average_results: 4,
          source: 'analytics',
        },
      ],
    })
  })

  it('returns 500 and logs when recovery lookup fails', async () => {
    const error = new Error('db offline')
    const db = createDb({})
    searchAnalytics.ensureSearchAnalyticsTable.mockRejectedValueOnce(error)
    const logger = { error: jest.fn() }
    const req: any = {
      query: { q: 'labtop' },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === ContainerRegistrationKeys.PG_CONNECTION) {
            return db
          }

          if (key === ContainerRegistrationKeys.LOGGER) {
            return logger
          }

          throw new Error(`Unexpected key: ${key}`)
        }),
      },
    }
    const res = createRes()

    await GET(req, res)

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch search recovery candidates',
      { message: 'db offline' }
    )
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to fetch search recovery.' })
  })
})