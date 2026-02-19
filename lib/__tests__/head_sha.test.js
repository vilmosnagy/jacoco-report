"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const action = __importStar(require("../src/action"));
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('@actions/glob');
describe('Head SHA resolution', function () {
    const eventName = 'pull_request';
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
    };
    const compareCommits = jest.fn(() => {
        return {
            data: {
                files: [],
            },
        };
    });
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
        };
    });
    beforeEach(() => {
        jest.clearAllMocks();
        github.context.eventName = eventName;
        github.context.payload = payload;
        github.context.sha = 'context-sha';
        github.context.repo = {
            owner: 'madrapps',
            repo: 'jacoco-report'
        };
        const glob = require('@actions/glob');
        glob.create = jest.fn(() => ({
            glob: jest.fn(() => ['./__tests__/__fixtures__/report.xml'])
        }));
    });
    function mockInputs(inputs) {
        core.getInput = jest.fn((key) => {
            if (key === 'comment-type')
                return inputs[key] || 'pr_comment';
            return inputs[key] || '';
        });
    }
    it('should use head-sha from input if provided', async () => {
        mockInputs({
            'paths': './__tests__/__fixtures__/report.xml',
            'token': 'secret-token',
            'head-sha': 'custom-head-sha'
        });
        await action.action();
        expect(compareCommits).toHaveBeenCalledWith(expect.objectContaining({
            base: 'base-sha-from-pr',
            head: 'custom-head-sha'
        }));
    });
    it('should fallback to pull_request head sha if head-sha input is not provided', async () => {
        mockInputs({
            'paths': './__tests__/__fixtures__/report.xml',
            'token': 'secret-token'
        });
        await action.action();
        expect(compareCommits).toHaveBeenCalledWith(expect.objectContaining({
            base: 'base-sha-from-pr',
            head: 'head-sha-from-pr'
        }));
    });
    it('should fallback to context.sha if both head-sha input and pr head are missing', async () => {
        github.context.eventName = 'pull_request';
        github.context.payload = {
            pull_request: {
                number: '45',
                base: { sha: 'base-sha' }
                // head is missing
            }
        };
        mockInputs({
            'paths': './__tests__/__fixtures__/report.xml',
            'token': 'secret-token'
        });
        await action.action();
        expect(compareCommits).toHaveBeenCalledWith(expect.objectContaining({
            base: 'base-sha',
            head: 'context-sha'
        }));
    });
});
