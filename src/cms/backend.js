(function () {
  "use strict";

  var REPOSITORY = "t1mlopez/latediagnosed-site";
  var BRANCH = "main";
  var SESSION_URL = "/api/cms/session";
  var REPOSITORY_URL = "/api/cms/repository";
  var redirectingToLogin = false;

  function showRepositoryAuthorizationFailure(message) {
    var panel = document.getElementById("repository-authorization-failure");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "repository-authorization-failure";
      panel.setAttribute("role", "alert");
      panel.style.cssText = "position:fixed;z-index:2147483647;inset:1rem 1rem auto;max-width:44rem;margin:auto;padding:1rem 1.25rem;border:2px solid #9b2c2c;border-radius:.75rem;background:#fff5f5;color:#5f1b1b;font:16px/1.5 system-ui,sans-serif;box-shadow:0 6px 30px rgba(0,0,0,.18)";
      var heading = document.createElement("strong");
      heading.textContent = "Content repository access is unavailable.";
      var detail = document.createElement("p");
      detail.id = "repository-authorization-detail";
      detail.style.marginBottom = "0";
      panel.appendChild(heading);
      panel.appendChild(detail);
      document.body.appendChild(panel);
    }
    document.getElementById("repository-authorization-detail").textContent = message ||
      "Okta confirmed your Content Center access, but the server could not reach the content repository. Contact the site administrator.";
  }

  window.showRepositoryAuthorizationFailure = showRepositoryAuthorizationFailure;

  async function responseJson(response) {
    var result = await response.json().catch(function () { return {}; });
    if (response.status === 401) {
      if (!redirectingToLogin) {
        redirectingToLogin = true;
        window.location.replace("/auth/login?returnTo=/admin/");
      }
      return new Promise(function () {});
    }
    if (!response.ok) {
      var message = typeof result.error === "string"
        ? result.error
        : "The content repository operation failed.";
      showRepositoryAuthorizationFailure(message);
      throw new Error(message);
    }
    return result;
  }

  function fileName(path) {
    return path.slice(path.lastIndexOf("/") + 1);
  }

  function mediaUrl(path) {
    return "/api/cms/media?path=" + encodeURIComponent(path);
  }

  function OktaCmsBackend(config) {
    this.repository = config.backend.repo || REPOSITORY;
    this.branch = config.backend.branch || BRANCH;
    this.mediaFolder = config.media_folder;
    this.csrf = null;
  }

  OktaCmsBackend.prototype.isGitBackend = function () {
    return true;
  };

  OktaCmsBackend.prototype.authComponent = function () {
    return createClass({
      componentDidMount: function () {
        this.props.onLogin({ oktaSession: true });
      },
      render: function () {
        return h(
          "main",
          { style: { maxWidth: "36rem", margin: "15vh auto", padding: "2rem", fontFamily: "system-ui, sans-serif" } },
          h("h1", null, "Opening Content Center"),
          h("p", null, "Confirming your Okta session and CMS Editors permission…")
        );
      },
    });
  };

  OktaCmsBackend.prototype.authenticate = async function () {
    var response = await fetch(SESSION_URL, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    var result = await responseJson(response);
    this.csrf = result.csrf;
    return result.user;
  };

  OktaCmsBackend.prototype.restoreUser = function () {
    return this.authenticate();
  };

  OktaCmsBackend.prototype.logout = function () {
    this.csrf = null;
    var form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/logout";
    form.hidden = true;
    document.body.appendChild(form);
    form.submit();
    return Promise.resolve();
  };

  OktaCmsBackend.prototype.getToken = function () {
    return Promise.resolve(null);
  };

  OktaCmsBackend.prototype.status = function () {
    return Promise.resolve({
      auth: { status: true },
      api: { status: true, statusPage: "" },
    });
  };

  OktaCmsBackend.prototype.gateway = async function (operation, payload) {
    if (!this.csrf) await this.authenticate();
    var response = await fetch(REPOSITORY_URL, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CMS-CSRF": this.csrf,
      },
      body: JSON.stringify(Object.assign({
        repository: this.repository,
        branch: this.branch,
        operation: operation,
      }, payload || {})),
    });
    if (response.status === 403) this.csrf = null;
    return responseJson(response);
  };

  OktaCmsBackend.prototype.entriesByFolder = async function (folder, extension, depth) {
    var result = await this.gateway("listEntries", { folder: folder, extension: extension, depth: depth });
    return result.entries;
  };

  OktaCmsBackend.prototype.entriesByFiles = async function (files) {
    var result = await this.gateway("entriesByFiles", { files: files });
    return result.entries;
  };

  OktaCmsBackend.prototype.getEntry = async function (path) {
    var result = await this.gateway("getEntry", { path: path });
    return result.entry;
  };

  OktaCmsBackend.prototype.getMedia = async function () {
    var result = await this.gateway("listMedia");
    return result.media.map(function (item) {
      return Object.assign({}, item, { displayURL: mediaUrl(item.path) });
    });
  };

  OktaCmsBackend.prototype.getMediaFile = async function (path) {
    var response = await fetch(mediaUrl(path), { credentials: "same-origin" });
    if (!response.ok) await responseJson(response);
    var blob = await response.blob();
    var file = new File([blob], fileName(path), { type: blob.type });
    var url = URL.createObjectURL(file);
    return {
      id: path,
      name: file.name,
      path: path,
      size: file.size,
      file: file,
      url: url,
      displayURL: url,
    };
  };

  OktaCmsBackend.prototype.persistEntry = async function (entry, options) {
    var writes = entry.dataFiles.map(function (file) {
      return { path: file.newPath || file.path, content: file.raw, encoding: "utf-8" };
    });
    var deletes = entry.dataFiles
      .filter(function (file) { return file.newPath && file.newPath !== file.path; })
      .map(function (file) { return file.path; });
    var mediaWrites = await Promise.all(entry.assets.map(async function (asset) {
      return { path: asset.path, content: await asset.toBase64(), encoding: "base64" };
    }));
    await this.gateway("write", {
      writes: writes.concat(mediaWrites),
      deletes: deletes,
      commitMessage: options.commitMessage,
    });
  };

  OktaCmsBackend.prototype.persistMedia = async function (mediaFile, options) {
    await this.gateway("write", {
      writes: [{ path: mediaFile.path, content: await mediaFile.toBase64(), encoding: "base64" }],
      deletes: [],
      commitMessage: options.commitMessage,
    });
    var file = mediaFile.fileObj;
    return {
      id: mediaFile.path,
      name: file ? file.name : fileName(mediaFile.path),
      path: mediaFile.path,
      size: file ? file.size : undefined,
      displayURL: file ? URL.createObjectURL(file) : mediaUrl(mediaFile.path),
    };
  };

  OktaCmsBackend.prototype.deleteFiles = function (paths, commitMessage) {
    return this.gateway("write", { writes: [], deletes: paths, commitMessage: commitMessage });
  };

  CMS.registerBackend("latediagnosed", OktaCmsBackend);
})();
