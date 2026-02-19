/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import * as action from '../src/action'
import * as core from '@actions/core'
import * as github from '@actions/github'

jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('@actions/glob')

describe('Head SHA resolution', function () {
  const eventName = 'pull_request'
  const payload = {
    pull_request: {
      number: '45',
      base: {
        sha: 'base-sha-from-pr',
      },
      head: {
        sha: 'head-sha-from-pr',
      },
    },
  }

  const compareCommits = jest.fn(() => {
    return {
      data: {
        files: [],
      },
    }
  })

  github.getOctokit = jest.fn(() => {
    return {
      rest: {
        repos: {
          compareCommits,
        },
        issues: {
          createComment: jest.fn(),
          listComments: jest.fn(),
          updateComment: jest.fn(),
        },
      },
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    github.context.eventName = eventName
    github.context.payload = payload
    github.context.sha = 'context-sha'
    github.context.repo = {
        owner: 'madrapps',
        repo: 'jacoco-report'
    }

    const glob = require('@actions/glob')
    glob.create = jest.fn(() => ({
      glob: jest.fn(() => ['./__tests__/__fixtures__/report.xml'])
    }))
  })

  function mockInputs(inputs: Record<string, string>) {
    core.getInput = jest.fn((key: string) => {
      if (key === 'comment-type') return inputs[key] || 'pr_comment'
      return inputs[key] || ''
    })
  }

  it('should use head-sha from input if provided', async () => {
    mockInputs({
      'paths': './__tests__/__fixtures__/report.xml',
      'token': 'secret-token',
      'head-sha': 'custom-head-sha'
    })

    await action.action()

    expect(compareCommits).toHaveBeenCalledWith(expect.objectContaining({
      base: 'base-sha-from-pr',
      head: 'custom-head-sha'
    }))
  })

  it('should fallback to pull_request head sha if head-sha input is not provided', async () => {
    mockInputs({
      'paths': './__tests__/__fixtures__/report.xml',
      'token': 'secret-token'
    })

    await action.action()

    expect(compareCommits).toHaveBeenCalledWith(expect.objectContaining({
      base: 'base-sha-from-pr',
      head: 'head-sha-from-pr'
    }))
  })

  it('should fallback to context.sha if both head-sha input and pr head are missing', async () => {
    github.context.eventName = 'pull_request'
    github.context.payload = {
        pull_request: {
            number: '45',
            base: { sha: 'base-sha' }
            // head is missing
        }
    }
    mockInputs({
      'paths': './__tests__/__fixtures__/report.xml',
      'token': 'secret-token'
    })

    await action.action()

    expect(compareCommits).toHaveBeenCalledWith(expect.objectContaining({
      base: 'base-sha',
      head: 'context-sha'
    }))
  })
})
