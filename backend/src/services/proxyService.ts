import * as cheerio from 'cheerio';
import { URL } from 'url';

export async function fetchAndProxyPage(targetUrlStr: string, pickMode: boolean = false): Promise<{ html: string; contentType: string }> {
  try {
    const targetUrl = new URL(targetUrlStr);

    const response = await fetch(targetUrlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 WebCapture/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    const contentType = response.headers.get('content-type') || 'text/html';

    if (!contentType.includes('text/html')) {
      const arrayBuffer = await response.arrayBuffer();
      return { html: Buffer.from(arrayBuffer).toString('base64'), contentType };
    }

    const rawHtml = await response.text();
    const $ = cheerio.load(rawHtml);

    // Resolve relative URLs to absolute or proxied URLs
    $('a[href], link[href], script[src], img[src]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const src = $el.attr('src');

      if (href && !href.startsWith('javascript:') && !href.startsWith('#') && !href.startsWith('data:')) {
        try {
          const absUrl = new URL(href, targetUrlStr).toString();
          if ($el.is('a')) {
            $el.attr('href', `/api/proxy?url=${encodeURIComponent(absUrl)}${pickMode ? '&pickMode=true' : ''}`);
          } else if ($el.is('link')) {
            $el.attr('href', absUrl);
          }
        } catch (_) {}
      }

      if (src && !src.startsWith('data:')) {
        try {
          const absUrl = new URL(src, targetUrlStr).toString();
          $el.attr('src', absUrl);
        } catch (_) {}
      }
    });

    // Inject base tag
    if ($('head').length > 0) {
      $('head').prepend(`<base href="${targetUrl.origin}">`);
    }

    // Injected DOM Element Picker Script
    const pickerScript = `
      <script>
        (function() {
          console.log('[WebCapture] Injected element picker active');
          var isPickMode = true;
          var highlightedEl = null;
          var originalOutline = '';
          var tooltip = null;

          function createTooltip() {
            if (tooltip) return;
            tooltip = document.createElement('div');
            tooltip.id = 'webcapture-picker-tooltip';
            tooltip.style.position = 'fixed';
            tooltip.style.zIndex = '999999';
            tooltip.style.padding = '4px 8px';
            tooltip.style.background = '#0f172a';
            tooltip.style.color = '#38bdf8';
            tooltip.style.border = '1px solid #0284c7';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontFamily = 'monospace';
            tooltip.style.fontSize = '12px';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
          }

          function isDynamicId(id) {
            if (!id) return true;
            return /\d/.test(id) || /^:\w+:/.test(id) || id.length > 30;
          }

          function getUniqueCssSelector(el) {
            if (!(el instanceof Element)) return '';
            var path = [];
            var curr = el;
            while (curr && curr.nodeType === Node.ELEMENT_NODE && curr.tagName !== 'BODY' && curr.tagName !== 'HTML') {
              var tag = curr.tagName.toLowerCase();

              // Use ID only if it is static (no numbers or random tokens)
              if (curr.id && !isDynamicId(curr.id)) {
                path.unshift(tag + '#' + curr.id);
                break;
              }

              // Prefer meaningful class names
              var validClasses = Array.from(curr.classList || []).filter(function(c) {
                return c && !c.startsWith('webcapture-') && !/\d{4,}/.test(c);
              });

              if (validClasses.length > 0) {
                var classSel = '.' + validClasses.join('.');
                path.unshift(classSel);
                // Break early if we hit a strong component/item class
                var hasStrongClass = validClasses.some(function(c) {
                  return ['titleline', 'quote', 'title', 'item', 'product', 'card', 'article', 'post', 'entry', 'row'].indexOf(c.toLowerCase()) !== -1;
                });
                if (hasStrongClass) break;
              } else {
                path.unshift(tag);
              }

              curr = curr.parentElement;
            }

            var fullPath = path.join(' > ');
            // If path contains class selectors, simplify leading generic tag parents
            if (fullPath.includes('.')) {
              var parts = fullPath.split(' > ');
              for (var i = 0; i < parts.length; i++) {
                if (parts[i].startsWith('.')) {
                  return parts.slice(i).join(' > ');
                }
              }
            }

            return fullPath || el.tagName.toLowerCase();
          }

          document.addEventListener('DOMContentLoaded', createTooltip);
          if (document.body) createTooltip();

          document.addEventListener('mouseover', function(e) {
            if (!isPickMode) return;
            var target = e.target;
            if (target === tooltip || (target.id && target.id.startsWith('webcapture-'))) return;

            if (highlightedEl) {
              highlightedEl.style.outline = originalOutline;
              highlightedEl.style.boxShadow = '';
            }

            highlightedEl = target;
            originalOutline = target.style.outline || '';
            target.style.outline = '2px solid #6366f1';
            target.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.5)';

            var selector = getUniqueCssSelector(target);
            if (tooltip) {
              tooltip.innerText = selector;
              tooltip.style.display = 'block';
              tooltip.style.top = (e.clientY + 12) + 'px';
              tooltip.style.left = (e.clientX + 12) + 'px';
            }
          }, true);

          document.addEventListener('mouseout', function(e) {
            if (highlightedEl && e.target === highlightedEl) {
              highlightedEl.style.outline = originalOutline;
              highlightedEl.style.boxShadow = '';
              highlightedEl = null;
              if (tooltip) tooltip.style.display = 'none';
            }
          }, true);

          document.addEventListener('click', function(e) {
            if (!isPickMode) return;
            var target = e.target;
            if (target === tooltip) return;

            e.preventDefault();
            e.stopPropagation();

            var selector = getUniqueCssSelector(target);
            var sampleText = (target.textContent || '').trim().substring(0, 100);
            var tagName = target.tagName.toLowerCase();
            var attributes = {};
            for (var i = 0; i < target.attributes.length; i++) {
              var attr = target.attributes[i];
              attributes[attr.name] = attr.value;
            }

            window.parent.postMessage({
              type: 'WEBCAPTURE_ELEMENT_SELECTED',
              selector: selector,
              text: sampleText,
              tagName: tagName,
              attributes: attributes
            }, '*');

            console.log('[WebCapture] Selected element:', selector);
          }, true);

          window.addEventListener('message', function(ev) {
            if (ev.data && ev.data.type === 'SET_PICK_MODE') {
              isPickMode = ev.data.enabled;
              if (!isPickMode && highlightedEl) {
                highlightedEl.style.outline = originalOutline;
                highlightedEl = null;
                if (tooltip) tooltip.style.display = 'none';
              }
            }
          });
        })();
      </script>
    `;

    $('body').append(pickerScript);

    return { html: $.html(), contentType: 'text/html; charset=utf-8' };
  } catch (err: any) {
    return {
      html: `<html><body style="font-family:sans-serif;padding:40px;background:#0f172a;color:#f8fafc;">
        <h2 style="color:#ef4444;">Proxy Error</h2>
        <p>Could not fetch target page: ${targetUrlStr}</p>
        <p style="color:#94a3b8;font-size:14px;">Reason: ${err.message}</p>
      </body></html>`,
      contentType: 'text/html; charset=utf-8'
    };
  }
}
