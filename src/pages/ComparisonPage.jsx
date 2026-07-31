import { useParams, Link } from 'react-router-dom'
import { MarketingLayout } from '../components/SiteChrome'
import Seo from '../components/Seo'
import { getComparison } from '../lib/comparisons'

export default function ComparisonPage() {
  const { competitor } = useParams()
  const config = getComparison(competitor)

  if (!config) {
    return (
      <MarketingLayout>
        <Seo title="Comparison not found" path={`/comparison/${competitor}`} />
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', color: 'var(--ink)' }}>Comparison Not Found</h1>
          <p style={{ color: 'var(--muted)', margin: '16px 0 24px' }}>We couldn't find a comparison page for "{competitor}".</p>
          <Link to="/app" className="btn-primary" style={{
            display: 'inline-block',
            background: 'var(--clay)',
            color: '#white',
            padding: '10px 20px',
            borderRadius: '6px',
            textDecoration: 'none'
          }}>Go to Studio</Link>
        </div>
      </MarketingLayout>
    )
  }

  return (
    <MarketingLayout>
      <Seo
        title={config.metaTitle}
        description={config.metaDescription}
        path={config.path}
      />

      <div className="comparison-page" style={{ maxWidth: '1040px', margin: '0 auto', padding: '60px 24px 80px' }}>
        {/* Kicker Tag */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '9999px',
            background: 'var(--clay-soft)',
            color: 'var(--clay-ink)',
            fontSize: '13px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {config.competitorName} Alternative
          </span>
        </div>

        {/* Hero Header */}
        <header className="comparison-hero" style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '48px',
            lineHeight: '1.15',
            fontWeight: '800',
            color: 'var(--ink)',
            maxWidth: '850px',
            margin: '0 auto 20px'
          }}>
            {config.h1}
          </h1>
          <p style={{
            fontSize: '20px',
            color: 'var(--muted)',
            lineHeight: '1.5',
            maxWidth: '720px',
            margin: '0 auto'
          }}>
            {config.subhead}
          </p>
        </header>

        {/* Dynamic Layout: At a glance + Details */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '40px',
          marginBottom: '64px'
        }}>
          {/* Quick Summary Card */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: 'var(--shadow-card)'
          }}>
            <h2 style={{
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--muted)',
              marginBottom: '20px',
              fontWeight: '700'
            }}>
              At a Glance
            </h2>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
              {config.atGlance.map((item, index) => (
                <li key={index} style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '16px',
                  alignItems: 'flex-start',
                  fontSize: '15px',
                  lineHeight: '1.6'
                }}>
                  <span style={{
                    color: item.type === 'pros' ? 'var(--ok)' : '#ef4444',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    lineHeight: '1'
                  }}>
                    {item.type === 'pros' ? '✓' : '✗'}
                  </span>
                  <span style={{ color: 'var(--ink-soft)' }}>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '32px',
            color: 'var(--ink)',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            Feature-by-Feature Comparison
          </h2>
          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface)' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '15px',
              minWidth: '600px'
            }}>
              <thead>
                <tr style={{ background: 'var(--clay-tint)', borderBottom: '2px solid var(--line-strong)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--ink)' }}>Feature</th>
                  <th style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--ink)' }}>{config.competitorName}</th>
                  <th style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--clay-ink)' }}>Notes2Pic</th>
                </tr>
              </thead>
              <tbody>
                {config.featuresTable.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--ink)' }}>{row.feature}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--muted)' }}>{row.competitor}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--ink-soft)', fontWeight: '500' }}>{row.notes2pic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Points */}
        <section style={{ maxWidth: '800px', margin: '0 auto 64px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '32px',
            color: 'var(--ink)',
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            Key Differences Explained
          </h2>
          {config.sections.map((sec, i) => (
            <div key={i} style={{ marginBottom: '40px' }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '24px',
                color: 'var(--ink)',
                marginBottom: '12px'
              }}>
                {sec.title}
              </h3>
              <p style={{
                fontSize: '16px',
                color: 'var(--ink-soft)',
                lineHeight: '1.7'
              }}>
                {sec.body}
              </p>
            </div>
          ))}
        </section>

        {/* Call To Action */}
        <section style={{
          textAlign: 'center',
          background: 'var(--paper-deep)',
          color: 'var(--on-deep)',
          padding: '48px 24px',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', marginBottom: '16px', color: 'var(--on-deep)' }}>
            Start styling your writing today
          </h2>
          <p style={{ color: 'var(--on-deep-muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto 32px', lineHeight: '1.5' }}>
            Choose native layouts for Substack, X, and Threads. Create customizable quote graphics and carousels in seconds.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/app" className="btn-primary" style={{
              background: 'var(--clay)',
              color: '#white',
              padding: '12px 28px',
              borderRadius: '6px',
              fontWeight: '600',
              textDecoration: 'none'
            }}>
              Open the Studio
            </Link>
            <Link to="/" style={{
              color: 'var(--on-deep)',
              border: '1px solid var(--on-deep-muted)',
              padding: '12px 28px',
              borderRadius: '6px',
              fontWeight: '600',
              textDecoration: 'none'
            }}>
              Learn More
            </Link>
          </div>
        </section>
      </div>
    </MarketingLayout>
  )
}
