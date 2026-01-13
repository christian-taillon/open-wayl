import Gio from "gi://Gio";
import GObject from "gi://GObject";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";

const BUS_NAME = "org.openwayl.Indicator";
const OBJECT_PATH = "/org/openwayl/Indicator";
const INTERFACE_NAME = "org.openwayl.Indicator";

const INDICATOR_STATE = {
  IDLE: "idle",
  RECORDING: "recording",
  PROCESSING: "processing",
};

const OpenWaylIndicator = GObject.registerClass(
  class OpenWaylIndicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, "OpenWayl Indicator", false);

      this._icon = new St.Icon({
        icon_name: "audio-input-microphone-symbolic",
        style_class: "openwayl-icon",
      });

      this.add_child(this._icon);
      this.add_style_class_name("openwayl-indicator");

      this._proxy = null;
      this._signalId = null;
      this._state = INDICATOR_STATE.IDLE;
      this._setState(false, false);
      this._connectDBus();
    }

    _connectDBus() {
      this._proxy = new Gio.DBusProxy({
        g_connection: Gio.DBus.session,
        g_name: BUS_NAME,
        g_object_path: OBJECT_PATH,
        g_interface_name: INTERFACE_NAME,
      });

      this._proxy.init_async(null, (proxy, result) => {
        try {
          proxy.init_finish(result);
          this._signalId = proxy.connectSignal(
            "StateChanged",
            (_proxy, _sender, [recording, processing]) => {
              this._setState(recording, processing);
            }
          );

          const cachedRecording = proxy.get_cached_property("Recording")?.unpack();
          const cachedProcessing = proxy.get_cached_property("Processing")?.unpack();
          if (cachedRecording !== undefined || cachedProcessing !== undefined) {
            this._setState(Boolean(cachedRecording), Boolean(cachedProcessing));
          }

          this._callRegisterClient();
        } catch (error) {
          this._setState(false, false);
        }
      });
    }

    _callRegisterClient() {
      if (!this._proxy) return;

      this._proxy.call(
        "RegisterClient",
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        () => {}
      );
    }

    _callUnregisterClient() {
      if (!this._proxy) return;

      this._proxy.call(
        "UnregisterClient",
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        () => {}
      );
    }

    _setState(isRecording, isProcessing) {
      let nextState = INDICATOR_STATE.IDLE;
      if (isRecording) {
        nextState = INDICATOR_STATE.RECORDING;
      } else if (isProcessing) {
        nextState = INDICATOR_STATE.PROCESSING;
      }

      if (this._state === nextState) return;

      this._state = nextState;
      this.remove_style_class_name("openwayl-recording");
      this.remove_style_class_name("openwayl-processing");

      if (nextState === INDICATOR_STATE.RECORDING) {
        this.add_style_class_name("openwayl-recording");
      } else if (nextState === INDICATOR_STATE.PROCESSING) {
        this.add_style_class_name("openwayl-processing");
      }
    }

    destroy() {
      this._callUnregisterClient();

      if (this._proxy && this._signalId) {
        this._proxy.disconnectSignal(this._signalId);
      }

      this._proxy = null;
      this._signalId = null;
      super.destroy();
    }
  }
);

export default class OpenWaylIndicatorExtension {
  enable() {
    this._indicator = new OpenWaylIndicator();
    Main.panel.addToStatusArea("openwayl-indicator", this._indicator);
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }
}
