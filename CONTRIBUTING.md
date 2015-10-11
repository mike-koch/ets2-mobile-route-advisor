# Contributing to ETS2 Mobile Route Advisor
So you want to contribute to ETS2 Mobile Route Advisor? Awesome! However, there are a few guidelines that need to be followed so the project can be as easy to maintain as possible.

## Submitting an issue
If all you are doing is submitting an issue, please check if your "issue" qualifies as a GitHub issue:
 - **Feature Requests:** Feature requests are now being recorded at the [official forum](http://forum.scssoft.com/viewtopic.php?f=34&t=178742). Please do not open these types of issues on GitHub. Issues opened that are "feature requests" will be closed.
 - **Translations:** Please open a pull request, not an issue for your translation.
 - **Bugs:** Yes, please open these types of issues here. :grinning:

## Submitting a Translations
Starting with version 3.0.0, translations are now being stored in a separate `i18n` branch.  If you would like to submit a translation, please create (or modify) the translation file in the `i18n` branch with your changes, and submit a pull request there.  Pull requests for translations submitted to the `master` branch will be rejected.  Once the pull request is merged, the translation will be available on the ETS2 Mobile Route Advisor site for download.

## Getting Started
If you have already completed any of these steps in the past (such as creating a GitHub account), you can skip the respective step.
 - Make sure you have a [GitHub account](http://github.com/signup/free)
 - Fork the repository on GitHub (for more help consult the [GitHub documentation](https://help.github.com/articles/fork-a-repo/))

## Making Changes
 - Create a feature branch from where to base your work off of
   - This will be the `master` branch in most cases
   - *Please do not work off of the `master` branch directly*
 - Make commits of logical units.
   - For example, if you add 10 new features, please make at least 10 commits (1 per feature). This way, if a feature needs to be removed, it will be as easy as reverting a commit, rather than removing all 10.
 - Check for unnecessary whitespace using the `git diff --check` command. If there is trailing whitespace, your pull request will be denied.

## Submitting Changes
 - Sign the [Contributor License Agreement](https://www.clahub.com/agreements/mkoch227/ets2-mobile-route-advisor)
 - Push your changes to a topic branch in your fork of the repository
 - Submit a pull request to the official ETS2 Mobile Route Advisor repository (mkoch227/ets2-mobile-route-advisor)
 - The owner of ETS2 Mobile Route Advisor will then inspect and test the code in the pull request.  Feedback will be given via GitHub comments.
 - The owner of ETS2 Mobile Route Advisor expects responses within two weeks of the original comment. If there is no feedback within that time range, the pull request will be considered abandoned and subsequently will be closed.
