import enum


class DeviceType(str, enum.Enum):
    IU = "IU"
    OU = "OU"
    HC = "HC"
    RF = "RF"


class DeviceStatus(str, enum.Enum):
    WORKING = "WORKING"
    NOT_WORKING = "NOT_WORKING"
    FAULTY = "FAULTY"


STATUS_COLORS = {
    DeviceStatus.WORKING: "#5F8F6B",
    DeviceStatus.NOT_WORKING: "#B68A3C",
    DeviceStatus.FAULTY: "#9B3E3E",
}