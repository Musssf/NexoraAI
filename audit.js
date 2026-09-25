import express from 'express';

const router = express.Router();

function getScore(checks) {
  const passed = checks.filter((check) => check.pass).length;
  return checks.length ? Math.round((passed / checks.length) * 100) : 0;
}

function normalizeUrl(value) {
  let url = value.trim();

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return new URL(url);
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase();

  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function extractMeta(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1].trim() : '';
}

router.post('/', async (req, res) => {
  try {
    const { url: inputUrl } = req.body;

    if (!inputUrl || typeof inputUrl !== 'string') {
      return res.status(400).json({
        message: 'Please provide a valid website URL.'
      });
    }

    const parsedUrl = normalizeUrl(inputUrl);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        message: 'Only HTTP and HTTPS websites are supported.'
      });
    }

    if (isPrivateHost(parsedUrl.hostname)) {
      return res.status(400).json({
        message: 'Private or localhost URLs cannot be audited.'
      });
    }

    const startTime = Date.now();

    const response = await fetch(
      .href, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NexoraAIWebsiteAudit/1.0)'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return res.status(400).json({
        message: `Website returned HTTP ${response.status}.`
      });
    }

    const html = await response.text();
    const finalUrl = response.url;

    const title = extractMeta(
      html,
      /<title[^>]*>([\s\S]*?)<\/title>/i
    );

    const description = extractMeta(
      html,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i
    );

    const viewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);

    const lang = /<html[^>]+lang=["'][^"']+["']/i.test(html);

    const h1Matches = html.match(/<h1\b[^>]*>/gi) || [];

    const imageMatches = html.match(/<img\b[^>]*>/gi) || [];

    const imagesWithoutAlt = imageMatches.filter(
      (img) => !/\balt\s*=/i.test(img)
    );

    const canonical = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html);

    const structuredData =
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>/i.test(html);

    const ogTitle =
      /<meta[^>]+property=["']og:title["'][^>]+content=/i.test(html);

    const ogDescription =
      /<meta[^>]+property=["']og:description["'][^>]+content=/i.test(html);

    const checks = {
      seo: [
        {
          name: 'Page title',
          pass: Boolean(title),
          detail: title
            ? `Title found: "${title.slice(0, 70)}"`
            : 'Add a descriptive <title> tag.'
        },
        {
          name: 'Meta description',
          pass: Boolean(description),
          detail: description
            ? 'Meta description found.'
            : 'Add a unique meta description.'
        },
        {
          name: 'H1 heading',
          pass: h1Matches.length === 1,
          detail:
            h1Matches.length === 1
              ? 'One H1 heading found.'
              : `Found ${h1Matches.length} H1 headings. Aim for one primary H1.`
        },
        {
          name: 'Canonical URL',
          pass: canonical,
          detail: canonical
            ? 'Canonical URL found.'
            : 'Add a canonical URL to reduce duplicate-content issues.'
        },
        {
          name: 'Structured data',
          pass: structuredData,
          detail: structuredData
            ? 'JSON-LD structured data found.'
            : 'Consider adding relevant Schema.org structured data.'
        }
      ],

      accessibility: [
        {
          name: 'HTML language',
          pass: lang,
          detail: lang
            ? 'HTML language attribute found.'
            : 'Add a lang attribute to the <html> element.'
        },
        {
          name: 'Image alt text',
          pass: imagesWithoutAlt.length === 0,
          detail:
            imageMatches.length === 0
              ? 'No images detected in the returned HTML.'
              : imagesWithoutAlt.length === 0
                ? 'All detected images have alt attributes.'
                : `${imagesWithoutAlt.length} of ${imageMatches.length} images are missing alt attributes.`
        },
        {
          name: 'Mobile viewport',
          pass: viewport,
          detail: viewport
            ? 'Responsive viewport meta tag found.'
            : 'Add the responsive viewport meta tag.'
        }
      ],

      social: [
        {
          name: 'Open Graph title',
          pass: ogTitle,
          detail: ogTitle
            ? 'og:title found.'
            : 'Add og:title for better social sharing.'
        },
        {
          name: 'Open Graph description',
          pass: ogDescription,
          detail: ogDescription
            ? 'og:description found.'
            : 'Add og:description for better social previews.'
        }
      ],

      performance: [
        {
          name: 'Server response',
          pass: responseTime < 1000,
          detail:
            responseTime < 1000
              ? `Initial response: ${responseTime} ms.`
              : `Initial response: ${responseTime} ms. Consider improving server response time.`
        },
        {
          name: 'HTML size',
          pass: Buffer.byteLength(html, 'utf8') < 500000,
          detail: `HTML size: ${Math.round(Buffer.byteLength(html, 'utf8') / 1024)} KB.`
        }
      ],

      security: [
        {
          name: 'HTTPS',
          pass: finalUrl.startsWith('https://'),
          detail: finalUrl.startsWith('https://')
            ? 'HTTPS is enabled.'
            : 'Use HTTPS to protect visitors and improve trust.'
        }
      ]
    };

    const scores = Object.fromEntries(
      Object.entries(checks).map(([category, items]) => [
        category,
        getScore(items)
      ])
    );

    const overallScore = Math.round(
      Object.values(scores).reduce((sum, score) => sum + score, 0) /
        Object.values(scores).length
    );

    const recommendations = [];

    Object.values(checks)
      .flat()
      .filter((check) => !check.pass)
      .forEach((check) => {
        recommendations.push(check.detail);
      });

    res.json({
      success: true,
      url: finalUrl,
      score: overallScore,
      scores,
      responseTime,
      recommendations,
      checks
    });
  } catch (error) {
    console.error('Audit error:', error);

    res.status(500).json({
      message:
        error.name === 'TimeoutError'
          ? 'The website took too long to respond.'
          : `Unable to audit this website: ${error.message}`
    });
  }
});

export default router;