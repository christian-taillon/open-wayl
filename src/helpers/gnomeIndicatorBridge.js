const dbus = require("dbus-next");

const BUS_NAME = "org.openwayl.Indicator";
const OBJECT_PATH = "/org/openwayl/Indicator";
const INTERFACE_NAME = "org.openwayl.Indicator";

const { Interface, method, signal, property } = dbus.interface;

class IndicatorInterface extends Interface {
  constructor(onClientChange) {
    super(INTERFACE_NAME);
    this._recording = false;
    this._processing = false;
    this._clientCount = 0;
    this._onClientChange = onClientChange;
  }

  get Recording() {
    return this._recording;
  }

  get Processing() {
    return this._processing;
  }

  get ClientCount() {
    return this._clientCount;
  }

  RegisterClient() {
    this._clientCount += 1;
    this._emitClientChange();
    return true;
  }

  UnregisterClient() {
    this._clientCount = Math.max(0, this._clientCount - 1);
    this._emitClientChange();
    return true;
  }

  setState(isRecording, isProcessing) {
    const recording = Boolean(isRecording);
    const processing = Boolean(isProcessing);
    this._recording = recording;
    this._processing = processing;
    this.emitPropertiesChanged({
      Recording: this._recording,
      Processing: this._processing,
    });
    this.StateChanged(this._recording, this._processing);
  }

  _emitClientChange() {
    this.ClientCountChanged(this._clientCount);
    this._onClientChange?.(this._clientCount);
  }

  StateChanged(_recording, _processing) {}

  ClientCountChanged(_count) {}
}

IndicatorInterface.prototype.RegisterClient = method({ outSignature: "b" })(
  IndicatorInterface.prototype.RegisterClient
);
IndicatorInterface.prototype.UnregisterClient = method({ outSignature: "b" })(
  IndicatorInterface.prototype.UnregisterClient
);
IndicatorInterface.prototype.Recording = property({
  signature: "b",
  access: "read",
})(IndicatorInterface.prototype.Recording);
IndicatorInterface.prototype.Processing = property({
  signature: "b",
  access: "read",
})(IndicatorInterface.prototype.Processing);
IndicatorInterface.prototype.ClientCount = property({
  signature: "u",
  access: "read",
})(IndicatorInterface.prototype.ClientCount);
IndicatorInterface.prototype.StateChanged = signal({ signature: "bb" })(
  IndicatorInterface.prototype.StateChanged
);
IndicatorInterface.prototype.ClientCountChanged = signal({ signature: "u" })(
  IndicatorInterface.prototype.ClientCountChanged
);

class GnomeIndicatorBridge {
  constructor({ windowManager }) {
    this.windowManager = windowManager;
    this.bus = null;
    this.interface = null;
    this.enabled = false;
    this.clientCount = 0;
  }

  async start() {
    if (process.platform !== "linux") {
      return;
    }

    try {
      this.bus = dbus.sessionBus();
      this.interface = new IndicatorInterface((count) => {
        this.clientCount = count;
        this.windowManager?.setGnomeExtensionActive?.(count > 0);
      });
      this.bus.export(OBJECT_PATH, this.interface);
      await this.bus.requestName(BUS_NAME);
    } catch (error) {
      console.error("Failed to start GNOME DBus bridge:", error);
    }
  }

  async stop() {
    if (this.bus) {
      this.bus.disconnect();
      this.bus = null;
    }
    this.interface = null;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.windowManager?.setGnomeTopBarMode?.(this.enabled);
  }

  setState({ isRecording, isProcessing }) {
    if (!this.interface || !this.enabled) {
      return;
    }

    this.interface.setState(Boolean(isRecording), Boolean(isProcessing));
  }

  getStatus() {
    return {
      enabled: this.enabled,
      clientCount: this.clientCount,
      extensionActive: this.clientCount > 0,
    };
  }
}

module.exports = GnomeIndicatorBridge;
