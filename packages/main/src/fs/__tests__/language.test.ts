import { describe, it, expect, vi } from 'vitest'
import { detectLanguage, getLanguageFromExtension, getLanguageFromShebang, type LanguageType } from '../language'

describe('language', () => {
  describe('detectLanguage', () => {
    it('should detect TypeScript from extension', () => {
      expect(detectLanguage('file.ts')).toBe('typescript')
      expect(detectLanguage('file.tsx')).toBe('typescript')
    })

    it('should detect JavaScript from extension', () => {
      expect(detectLanguage('file.js')).toBe('javascript')
      expect(detectLanguage('file.jsx')).toBe('javascript')
      expect(detectLanguage('file.mjs')).toBe('javascript')
    })

    it('should detect Python from extension', () => {
      expect(detectLanguage('file.py')).toBe('python')
      expect(detectLanguage('file.pyw')).toBe('python')
    })

    it('should detect Java from extension', () => {
      expect(detectLanguage('file.java')).toBe('java')
    })

    it('should detect C/C++ from extension', () => {
      expect(detectLanguage('file.c')).toBe('c')
      expect(detectLanguage('file.cpp')).toBe('cpp')
      expect(detectLanguage('file.cc')).toBe('cpp')
      expect(detectLanguage('file.hpp')).toBe('cpp')
      expect(detectLanguage('file.h')).toBe('cpp')
    })

    it('should detect HTML from extension', () => {
      expect(detectLanguage('file.html')).toBe('html')
      expect(detectLanguage('file.htm')).toBe('html')
    })

    it('should detect CSS from extension', () => {
      expect(detectLanguage('file.css')).toBe('css')
      expect(detectLanguage('file.scss')).toBe('scss')
      expect(detectLanguage('file.sass')).toBe('scss')
      expect(detectLanguage('file.less')).toBe('less')
    })

    it('should detect JSON from extension', () => {
      expect(detectLanguage('file.json')).toBe('json')
    })

    it('should detect Markdown from extension', () => {
      expect(detectLanguage('file.md')).toBe('markdown')
      expect(detectLanguage('file.markdown')).toBe('markdown')
    })

    it('should detect YAML from extension', () => {
      expect(detectLanguage('file.yaml')).toBe('yaml')
      expect(detectLanguage('file.yml')).toBe('yaml')
    })

    it('should detect XML from extension', () => {
      expect(detectLanguage('file.xml')).toBe('xml')
    })

    it('should detect Shell from extension', () => {
      expect(detectLanguage('file.sh')).toBe('shell')
      expect(detectLanguage('file.bash')).toBe('shell')
      expect(detectLanguage('file.zsh')).toBe('shell')
    })

    it('should detect Rust from extension', () => {
      expect(detectLanguage('file.rs')).toBe('rust')
    })

    it('should detect Go from extension', () => {
      expect(detectLanguage('file.go')).toBe('go')
    })

    it('should detect Ruby from extension', () => {
      expect(detectLanguage('file.rb')).toBe('ruby')
    })

    it('should detect PHP from extension', () => {
      expect(detectLanguage('file.php')).toBe('php')
    })

    it('should detect SQL from extension', () => {
      expect(detectLanguage('file.sql')).toBe('sql')
    })

    it('should detect from shebang when no extension', () => {
      const content = '#!/usr/bin/env node\nconsole.log("hello")'
      expect(detectLanguage('script', content)).toBe('javascript')
    })

    it('should detect Python from shebang', () => {
      const content = '#!/usr/bin/env python3\nprint("hello")'
      expect(detectLanguage('script', content)).toBe('python')
    })

    it('should detect Bash from shebang', () => {
      const content = '#!/bin/bash\necho hello'
      expect(detectLanguage('script', content)).toBe('shell')
    })

    it('should return plaintext for unknown extension', () => {
      expect(detectLanguage('file.unknown')).toBe('plaintext')
    })

    it('should return plaintext for files without extension', () => {
      expect(detectLanguage('Makefile')).toBe('plaintext')
    })

    it('should handle paths with directories', () => {
      expect(detectLanguage('/path/to/file.ts')).toBe('typescript')
      expect(detectLanguage('C:\\path\\to\\file.js')).toBe('javascript')
    })
  })

  describe('getLanguageFromExtension', () => {
    it('should return language for known extension', () => {
      expect(getLanguageFromExtension('ts')).toBe('typescript')
      expect(getLanguageFromExtension('js')).toBe('javascript')
      expect(getLanguageFromExtension('py')).toBe('python')
    })

    it('should return null for unknown extension', () => {
      expect(getLanguageFromExtension('unknown')).toBeNull()
      expect(getLanguageFromExtension('xyz')).toBeNull()
    })

    it('should be case insensitive', () => {
      expect(getLanguageFromExtension('TS')).toBe('typescript')
      expect(getLanguageFromExtension('JS')).toBe('javascript')
    })
  })

  describe('getLanguageFromShebang', () => {
    it('should detect node/javascript', () => {
      expect(getLanguageFromShebang('#!/usr/bin/env node')).toBe('javascript')
      expect(getLanguageFromShebang('#!/usr/bin/node')).toBe('javascript')
    })

    it('should detect python', () => {
      expect(getLanguageFromShebang('#!/usr/bin/env python')).toBe('python')
      expect(getLanguageFromShebang('#!/usr/bin/env python3')).toBe('python')
      expect(getLanguageFromShebang('#!/usr/bin/python')).toBe('python')
    })

    it('should detect bash/sh', () => {
      expect(getLanguageFromShebang('#!/bin/bash')).toBe('shell')
      expect(getLanguageFromShebang('#!/bin/sh')).toBe('shell')
      expect(getLanguageFromShebang('#!/usr/bin/env bash')).toBe('shell')
    })

    it('should detect ruby', () => {
      expect(getLanguageFromShebang('#!/usr/bin/env ruby')).toBe('ruby')
      expect(getLanguageFromShebang('#!/usr/bin/ruby')).toBe('ruby')
    })

    it('should detect perl', () => {
      expect(getLanguageFromShebang('#!/usr/bin/env perl')).toBe('perl')
    })

    it('should detect php', () => {
      expect(getLanguageFromShebang('#!/usr/bin/env php')).toBe('php')
    })

    it('should return null for no shebang', () => {
      expect(getLanguageFromShebang('console.log("hello")')).toBeNull()
    })

    it('should return null for unknown interpreter', () => {
      expect(getLanguageFromShebang('#!/usr/bin/env unknown')).toBeNull()
    })

    it('should handle shebang with arguments', () => {
      expect(getLanguageFromShebang('#!/usr/bin/env python3 -u')).toBe('python')
    })
  })
})
