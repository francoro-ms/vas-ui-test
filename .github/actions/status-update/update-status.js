const core = require('@actions/core')
const { GitHub, context } = require('@actions/github')

async function run() {
  try {
    const GITHUB_TOKEN = core.getInput('REPO_TOKEN')

    const github = new GitHub({
      auth: `token ${GITHUB_TOKEN}`,
      userAgent: 'octokit/rest.js v1.2.3',
    })

    const { payload, sha } = context

    const baseObject = {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
    }

    const baseComment = `Deploy preview ready! :rocket:\n\nBuilt with commit ${payload.pull_request.head.sha}\n\nhttps://storybook-${payload.number}.vas-test.com`

    if (payload.action === 'opened') {
      // No comments exist yet. Post a new comment
      await github.issues.createComment({
        ...baseObject,
        issue_number: payload.number,
        body: baseComment,
      })
    } else if (payload.action === 'synchronize') {
      // Comment _should_ exist, look it up and update it
      const currentIssueComments = await github.issues.listComments({
        ...baseObject,
        issue_number: payload.number,
      })

      const botComment = currentIssueComments.data.find(issue => issue.user.login === 'vas-build')

      if (botComment) {
        await github.issues.updateComment({
          ...baseObject,
          comment_id: botComment.id,
          body: baseComment,
        })
      } else {
        // Just in case there is no comment, create a new one
        await github.issues.createComment({
          ...baseObject,
          issue_number: payload.number,
          body: baseComment,
        })
      }
    }

    await github.repos.createStatus({
      ...baseObject,
      sha: payload.pull_request.head.sha,
      context: 'Live Preview',
      state: 'success',
      description: 'PR is ready for preview',
      target_url: `https://storybook-${payload.number}.vas-test.com`,
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = run
