import enum


class DeviceType(str, enum.Enum):
    IU = "IU"
    OU = "OU"
    HC = "HC"
    RF = "RF"
    # Auto-alignment: the gyro the OU mounts on, and its controller box.
    # Gyro cable and power cables are bulk inventory items, not devices.
    GYRO = "GYRO"
    GYRO_CTRL = "GYRO_CTRL"


class DeviceStatus(str, enum.Enum):
    WORKING = "WORKING"
    NOT_WORKING = "NOT_WORKING"
    FAULTY = "FAULTY"


STATUS_COLORS = {
    DeviceStatus.WORKING: "#5F8F6B",
    DeviceStatus.NOT_WORKING: "#B68A3C",
    DeviceStatus.FAULTY: "#9B3E3E",
}