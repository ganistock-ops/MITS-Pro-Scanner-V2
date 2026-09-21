import re
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class TestPaginationAndStickyColumns(unittest.TestCase):
    def setUp(self):
        with open(BASE_DIR / 'index.html', encoding='utf-8') as f:
            self.index_html = f.read()
        with open(BASE_DIR / 'wordpress_live_embed.html', encoding='utf-8') as f:
            self.wp_html = f.read()
        with open(BASE_DIR / 'js' / 'app.js', encoding='utf-8') as f:
            self.app_js = f.read()
        with open(BASE_DIR / 'css' / 'style.css', encoding='utf-8') as f:
            self.css = f.read()

    def test_css_sticky_and_pagination(self):
        self.assertIn('.sticky-col-1', self.css)
        self.assertIn('.sticky-col-2', self.css)
        self.assertIn('.entry-td', self.css)
        self.assertIn('.tags-td', self.css)
        self.assertIn('.pagination-bar', self.css)
        self.assertIn('.page-btn', self.css)

    def test_index_html_structure(self):
        self.assertIn('id="pagination-bar"', self.index_html)
        self.assertIn('id="pagination-info"', self.index_html)
        self.assertIn('id="pagination-controls"', self.index_html)
        self.assertIn('sticky-col sticky-col-1', self.index_html)
        self.assertIn('sticky-col sticky-col-2', self.index_html)

        # Static thead must have 6 columns with Symbol col 1 and CMP col 2
        m = re.search(r'<thead>\s*<tr>([\s\S]*?)</tr>\s*</thead>', self.index_html)
        self.assertIsNotNone(m)
        ths = re.findall(r'<th[\s\S]*?>(.*?)</th>', m.group(1))
        self.assertEqual(len(ths), 6)
        self.assertIn('Symbol', ths[0])
        self.assertIn('CMP', ths[1])
        self.assertIn('Sector', ths[2])

    def test_app_js_pagination_and_columns(self):
        self.assertIn('currentPage: 1', self.app_js)
        self.assertIn('pageSize: 10', self.app_js)
        self.assertIn('renderPaginationControls', self.app_js)
        self.assertIn('state.currentPage = 1', self.app_js)

        # Tab 1 thead
        m_tab1 = re.search(r"if \(state\.activeTab === 'setup_1'\)\s*\{\s*thead\.innerHTML = `([\s\S]*?)`;", self.app_js)
        self.assertIsNotNone(m_tab1)
        # Check Symbol is col 1, CMP is col 2
        tab1_cols = re.findall(r"renderSortHeader\('([^']+)'", m_tab1.group(1))
        self.assertEqual(tab1_cols[0], 'symbol')
        self.assertEqual(tab1_cols[1], 'cmp')
        self.assertEqual(tab1_cols[2], 'sector')

    def test_wordpress_embed_structure(self):
        self.assertIn('id="wp-pagination-bar"', self.wp_html)
        self.assertIn('id="wp-pagination-info"', self.wp_html)
        self.assertIn('id="wp-pagination-controls"', self.wp_html)
        self.assertIn('wp-sticky-col-1', self.wp_html)
        self.assertIn('wp-sticky-col-2', self.wp_html)
        self.assertIn('currentPage: 1', self.wp_html)
        self.assertIn('pageSize: 10', self.wp_html)
        self.assertIn('renderWpPaginationControls', self.wp_html)
        self.assertIn('WP_STATE.currentPage = 1', self.wp_html)

        # Static thead in wp_html
        m_wp = re.search(r'<table class="wp-pro-table">\s*<thead>\s*<tr>([\s\S]*?)</tr>\s*</thead>', self.wp_html)
        self.assertIsNotNone(m_wp)
        ths = re.findall(r'<th[\s\S]*?>(.*?)</th>', m_wp.group(1))
        self.assertEqual(len(ths), 6)
        self.assertIn('Symbol', ths[0])
        self.assertIn('Sector', ths[1])
        self.assertIn('CMP', ths[2])

    def test_mobile_disable_sticky(self):
        # Verify media query in style.css
        self.assertIn('@media (max-width: 768px)', self.css)
        self.assertIn('position: static !important;', self.css)

        # Verify media query in index.html
        self.assertIn('@media (max-width: 768px)', self.index_html)
        self.assertIn('position: static !important;', self.index_html)

        # Verify media query in wordpress_live_embed.html
        self.assertIn('@media (max-width: 768px)', self.wp_html)
        self.assertIn('position: static !important;', self.wp_html)

if __name__ == '__main__':
    unittest.main()
